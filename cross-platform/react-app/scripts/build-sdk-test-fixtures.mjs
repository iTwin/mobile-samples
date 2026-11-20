// Bundle the local SDK implementations into browser-ready JavaScript
// for the Android and iOS test WebViews. This tests the current TypeScript source
// without maintaining a separate copy; the behavior tests remain handwritten.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

async function bundleSDK(source, name, filename) {
  const result = await build({
    configFile: false,
    publicDir: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: { dedupe: ["base64-js"] },
    build: {
      write: false,
      minify: false,
      target: "es2020",
      lib: {
        entry: fileURLToPath(new URL(`../../../../mobile-sdk-core/src/mobile-sdk-core/${source}.ts`, import.meta.url)),
        name,
        formats: ["iife"],
      },
      rollupOptions: {
        output: { intro: `window.sdk${source}Source = 'mobile-sdk-core/src/mobile-sdk-core/${source}.ts';` },
      },
    },
  });
  const bundle = (Array.isArray(result) ? result[0] : result).output.find((output) => output.type === "chunk");
  if (!bundle) throw new Error(`${source} fixture bundle was not generated`);
  for (const directory of [
    new URL("../build/sdk-tests/", import.meta.url),
    new URL("../../../Android/Shared/src/debug/assets/sdk-tests/", import.meta.url),
  ]) {
    await mkdir(directory, { recursive: true });
    const destination = new URL(filename, directory);
    await writeFile(destination, bundle.code);
    console.log(`Generated ${fileURLToPath(destination)}`);
  }
}
await bundleSDK("Geolocation", "SDKGeolocation", "geolocation.js");
await bundleSDK("Messenger", "SDKMessenger", "messenger.js");
for (const fixture of ["location.html", "location-behavior.js", "messenger.html", "messenger-behavior.js"]) {
  await copyFile(
    new URL(`../../../Android/Shared/src/debug/assets/sdk-tests/${fixture}`, import.meta.url),
    new URL(`../build/sdk-tests/${fixture}`, import.meta.url),
  );
}
