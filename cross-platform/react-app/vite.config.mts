/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { defineConfig, searchForWorkspaceRoot } from "vite";
import browserslistToEsbuild from "browserslist-to-esbuild";
import copy from "rollup-plugin-copy";
import { visualizer as rollupVisualizer } from "rollup-plugin-visualizer";
import externalGlobals from "rollup-plugin-external-globals";
import webpackStats from "rollup-plugin-webpack-stats";
import * as packageJson from "./package.json";
import path, { resolve } from "path";
import react from '@vitejs/plugin-react';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const mode =
  process.env.NODE_ENV === "development" ? "development" : "production";

// array of public directories static assets from dependencies to copy
const assets = ["./public/*"]; // assets for test-app

// Get a list of public assets directories from all itwin and bentley dependencies
// This is used to copy static assets from dependencies to the public directory
// so that they can be served by Vite during development and included in the build.
Object.keys(packageJson.dependencies).forEach((pkgName) => {
  if (pkgName.startsWith("@itwin")) {
    try {
      // gets dependency path
      const pkgPath = require.resolve(pkgName);
      // replaces everything after /lib/ with /lib/public/* to get static assets
      let pkgPublicPath = pkgPath.replace(/([/\\]lib[/\\]).*/, "$1public/*");

      const assetsPath = path
        .relative(process.cwd(), pkgPublicPath)
        .replace(/\\/g, "/"); // use relative path with forward slashes
      if (assetsPath.endsWith("lib/public/*")) {
        // filter out pkgs that actually dont have assets
        assets.push(assetsPath);
      }
    } catch { }
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ }) => {
  // REACT_APP_BUILD_TARGET is used by the CameraSampleApp to determine which app to load.
  // This will be injected as process.env.REACT_APP_BUILD_TARGET in the frontend.
  // It is set in the package.json camera scripts.
  // Injecting all of process.env is not recommended, and it also generates a warning at build time.
  const appEnv = { REACT_APP_BUILD_TARGET: process.env.REACT_APP_BUILD_TARGET, };
  return {
    debug: mode === "development",
    server: {
      open: false, // don't open browser
      port: 3000,
      strictPort: true, // exit if port is already in use
      fs: {
        // give Vite access to files in itwinjs-core root directory
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
    },
    publicDir: ".static-assets",
    logLevel: process.env.VITE_CI ? "error" : "warn",
    esbuild: {
      target: "es2023",
    },
    build: {
      outDir: "./build",
      sourcemap: !process.env.VITE_CI, // append to the resulting output file if not running in CI.
      chunkSizeWarningLimit: 7000, // in kB, default is 500kB
      target: browserslistToEsbuild(), // for browserslist in package.json
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
        // run `npm run build --stats` to view stats
        plugins: [
          ...(process.env.OUTPUT_STATS !== undefined
            ? [
              rollupVisualizer({
                open: true,
                filename: "stats.html",
                template: "treemap",
                sourcemap: true,
              }),
              webpackStats(), // needs to be the last plugin
            ]
            : []),
          externalGlobals({
            // allow global `window` object to access electron as external global
            electron: "window['electron']",
          })
        ],
      },
    },
    plugins: [
      react(),
      // copy static assets to .static-assets folder
      copy({
        targets: [
          {
            src: assets,
            dest: ".static-assets",
          },
        ],
        overwrite: true,
        copyOnce: true, // only during initial build or on change
        hook: "buildStart",
      }),
    ],
    define: {
      "process.env": appEnv, // injects appEnv into the frontend as process.env
    },
    resolve: {
      alias: [
        { find: "~@itwin", replacement: resolve(__dirname, "node_modules/@itwin") }, // appui imports require this alias
      ],
    },
  };
});
