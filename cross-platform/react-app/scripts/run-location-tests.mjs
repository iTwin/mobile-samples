import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const argumentsList = process.argv.slice(2);
const avd = argumentsList.find((argument) => argument.startsWith("--avd="))?.slice(6);
const showWindow = argumentsList.includes("--show-window");
const [platform, device, suppliedApp] = argumentsList.filter((argument) => !argument.startsWith("--avd=") && argument !== "--show-window");
if (!["ios", "android"].includes(platform) || !device || (platform === "ios" && !suppliedApp)) {
  throw new Error("Usage: node scripts/run-location-tests.mjs ios <simulator-udid> <app-path> | android <emulator-serial> [apk-path] [--avd=<name>] [--show-window]");
}
const adb = `${process.env.ANDROID_HOME ?? `${homedir()}/Library/Android/sdk`}/platform-tools/adb`;
const emulatorExecutable = `${process.env.ANDROID_HOME ?? `${homedir()}/Library/Android/sdk`}/emulator/emulator`;
const androidPackage = "com.bentley.sample.itwinstarter";
const iosPackage = "com.bentley.sample.MobileStarter";
const app = suppliedApp ?? fileURLToPath(new URL("../../../Android/iTwinStarter/app/build/outputs/apk/debug/app-debug.apk", import.meta.url));
function command(executable, args, timeoutMillis = 60000) {
  const result = spawnSync(executable, args, { encoding: "utf8", timeout: timeoutMillis });
  if (result.error || result.status !== 0) throw new Error(`${executable} ${args.join(" ")}: ${result.error ?? result.stderr ?? result.stdout}`);
  return result.stdout;
}
function android(...args) { return command(adb, ["-s", device, ...args]); }
function ios(...args) { return command("xcrun", ["simctl", ...args]); }

let moved = false;
let tick = 0;
function inject() {
  const latitude = (moved ? 37.3449 : 37.3349) + (tick++ % 2) * 0.00001;
  const longitude = moved ? -121.9990 : -122.0090;
  if (platform === "ios") ios("location", device, "set", `${latitude},${longitude}`);
  else android("emu", "geo", "fix", String(longitude), String(latitude));
}

let logs;
let interval;
let timeout;
let interrupt;
let emulator;
try {
  if (platform === "android" && avd) {
    const port = /^emulator-(\d+)$/.exec(device)?.[1];
    if (!port) throw new Error("An AVD requires an emulator-<port> device serial");
    emulator = spawn(emulatorExecutable, ["-avd", avd, "-port", port, ...(showWindow ? [] : ["-no-window"]), "-no-audio"], { stdio: "ignore" });
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 120000;
      const check = setInterval(() => {
        const result = spawnSync(adb, ["-s", device, "shell", "getprop", "sys.boot_completed"], { encoding: "utf8", timeout: 5000 });
        if (result.stdout?.trim() === "1") {
          clearInterval(check);
          resolve();
        } else if (Date.now() > deadline || emulator.exitCode !== null) {
          clearInterval(check);
          reject(new Error("Android emulator did not boot"));
        }
      }, 1000);
      emulator.once("error", (error) => { clearInterval(check); reject(error); });
    });
  }
  if (platform === "ios") {
    ios("install", device, app);
    ios("privacy", device, "grant", "location", iosPackage);
    logs = spawn("xcrun", ["simctl", "spawn", device, "log", "stream", "--style", "compact", "--level", "info", "--predicate", "eventMessage CONTAINS 'SDKTests:'"], { stdio: ["ignore", "pipe", "pipe"] });
  } else {
    command(adb, ["-s", device, "install", "-r", app], 180000);
    android("shell", "pm", "grant", androidPackage, "android.permission.ACCESS_COARSE_LOCATION");
    android("shell", "pm", "grant", androidPackage, "android.permission.ACCESS_FINE_LOCATION");
    android("shell", "cmd", "location", "set-location-enabled", "true");
    android("logcat", "-c");
    logs = spawn(adb, ["-s", device, "logcat", "-v", "brief", "SDKTests:I", "*:S"], { stdio: ["ignore", "pipe", "pipe"] });
  }
  inject();
  const result = new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error("Location suite timed out after 180 seconds")), 180000);
    interrupt = () => reject(new Error("Location suite cancelled"));
    process.once("SIGINT", interrupt);
    logs.once("error", reject);
    logs.once("exit", (code) => reject(new Error(`Device log stream exited (${code})`)));
    const lines = createInterface({ input: logs.stdout });
    lines.on("line", (line) => {
      if (!line.includes("SDKTests")) return;
      console.log(line);
      if (line.includes("READY: location change")) moved = true;
      if (line.includes("FAIL:")) reject(new Error("Location behavior suite reported a failure"));
      const summary = /Result: (\d+)\/(\d+) passed/.exec(line);
      if (summary) {
        if (summary[1] === "8" && summary[2] === "8") resolve();
        else reject(new Error(`Incomplete location suite: ${summary[0]}`));
      }
    });
    interval = setInterval(() => {
      try { inject(); } catch (error) { reject(error); }
    }, 1000);
  });
  if (platform === "ios") {
    ios("launch", "--terminate-running-process", device, iosPackage, "-sdk-tests", "-sdk-test-suite", "geolocation");
  } else {
    android("shell", "am", "force-stop", androidPackage);
    android("shell", "am", "start", "-n", `${androidPackage}/com.bentley.sample.shared.SDKTestsActivity`, "--es", "sdk-test-suite", "geolocation");
  }
  await result;
  console.log(`${platform}: all 8 location behavior checks passed`);
} catch (error) {
  if (platform === "android") {
    console.error(android("logcat", "-d", "-v", "brief", "ITMGeolocationManager:V", "AndroidRuntime:E", "chromium:E", "*:S"));
    console.error(android("shell", "dumpsys", "location"));
    android("shell", "uiautomator", "dump", "/sdcard/sdk-location-test-window.xml");
    console.error(android("shell", "cat", "/sdcard/sdk-location-test-window.xml"));
  }
  throw error;
} finally {
  clearInterval(interval);
  clearTimeout(timeout);
  if (interrupt) process.removeListener("SIGINT", interrupt);
  logs?.kill();
  if (platform === "ios") ios("location", device, "clear");
  if (emulator) {
    try { android("emu", "kill"); } finally { emulator.kill(); }
  }
}
