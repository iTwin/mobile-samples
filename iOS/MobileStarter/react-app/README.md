# Instructions for @itwin/mobile development

Note: These are build instructions for running these samples while using local builds of the two @itwin/mobile npm packages. You would do this if you want to make modifications to @itwin/mobile-sdk-core and/or @itwin/mobile-ui-react.

## Pre setup

Follow the instructions in the [iOS Readme](../../README.md) to get things working for a standard sample build.

## Initial checkout and build

1. Make sure that your system is configured to use node 14.
1. cd into <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm install`.
1. Check out https://github.com/iTwin/mobile-sdk-core into <span style="font-family: monospace">mobile-sdk-core</span> alongside <span style="font-family: monospace">mobile-samples</span>.
1. cd into <span style="font-family: monospace">mobile-sdk-core</span>.
1. Run `npm install`.
1. Run `npm run build:debug`. Note: this will copy the build into the react-app node_modules for mobile-samples. This will override the packages from npmjs.org. Note that npm __will not work__. Also, if you ever run npm install again in the react-app directory above, you have to re-copy the mobile-sdk-core and mobile-ui-react output. This can be done by running the `syncToTestApp.sh` shell script from mobile-sdk-core, and is done automatically when you use the build:debug npm script.
1. Check out https://github.com/iTwin/mobile-ui-react into <span style="font-family: monospace">mobile-ui-react</span> alongside <span style="font-family: monospace">mobile-samples</span>.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm install`.
1. Run `npm run build:debug`.
1. cd back to <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm run build`.
1. Run `npm run start` to start the React debug server.
1. Open <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/MobileStarter.xcodeproj</span>.
1. Run

## Updates

1. Use `git pull` to update <span style="font-family: monospace">mobile-samples</span>, <span style="font-family: monospace">mobile-sdk-core</span>, and <span style="font-family: monospace">mobile-ui-react</span>.
1. cd into <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm install`.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm install`
1. cd into <span style="font-family: monospace">mobile-sdk-core</span>.
1. Run `npm install`.
1. Run `npm run build:debug`.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm run build:debug`.
1. cd into <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm run build`
1. Run `npm run start` to start the React debug server
1. Open <span style="font-family: monospace">mobile-samples/iOS/MobileStarter/MobileStarter.xcodeproj</span>.
1. File->Packages->Update to Latest Package Versions
1. Wait for Xcode to download and install any updates to the dependent Swift Packages.
1. Run
