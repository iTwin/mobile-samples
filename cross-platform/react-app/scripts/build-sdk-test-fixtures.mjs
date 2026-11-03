// Bundle the local SDK geolocation implementation into browser-ready JavaScript
// for the Android and iOS test WebViews. This tests the current TypeScript source
// without maintaining a separate copy; the behavior tests remain handwritten.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const result = await build({
  configFile: false,
  publicDir: false,
  build: {
    write: false,
    minify: false,
    target: "es2020",
    lib: {
      entry: fileURLToPath(new URL("../../../../mobile-sdk-core/src/mobile-sdk-core/Geolocation.ts", import.meta.url)),
      name: "SDKGeolocation",
      formats: ["iife"],
    },
    rollupOptions: {
      output: { intro: "window.sdkGeolocationSource = 'mobile-sdk-core/src/mobile-sdk-core/Geolocation.ts';" },
    },
  },
});
const bundle = (Array.isArray(result) ? result[0] : result).output.find((output) => output.type === "chunk");
if (!bundle) throw new Error("Geolocation fixture bundle was not generated");
for (const directory of [
  new URL("../build/sdk-tests/", import.meta.url),
  new URL("../../../Android/Shared/src/debug/assets/sdk-tests/", import.meta.url),
]) {
  await mkdir(directory, { recursive: true });
  const destination = new URL("geolocation.js", directory);
  await writeFile(destination, bundle.code);
  console.log(`Generated ${fileURLToPath(destination)}`);
}
for (const fixture of ["location.html", "location-behavior.js"]) {
  await copyFile(
    new URL(`../../../Android/Shared/src/debug/assets/sdk-tests/${fixture}`, import.meta.url),
    new URL(`../build/sdk-tests/${fixture}`, import.meta.url),
  );
}
