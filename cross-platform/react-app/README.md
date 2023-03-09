# Instructions for @itwin/mobile development

Note: These are build instructions for running these samples while using local builds of the two @itwin/mobile npm packages. You would do this if you want to make modifications to @itwin/mobile-sdk-core and/or @itwin/mobile-ui-react.

## Pre setup

Follow the instructions in the [iOS Readme](../../README.md) to get things working for a standard sample build.

## Initial checkout and build

1. Make sure that your system is configured to use node 14.
1. Get sources:
    1. Clone https://github.com/iTwin/mobile-sdk-ios into `mobile-sdk-ios` alongside `mobile-samples`.
    1. Clone https://github.com/iTwin/mobile-sdk-core into `mobile-sdk-core` alongside `mobile-samples`.
    1. Clone https://github.com/iTwin/mobile-ui-react into `mobile-ui-react` alongside `mobile-samples`.
    1. If you are not on the main branch, make sure to switch to the appropriate branch for _all_ GitHub repositories above after cloning.
1. Build cross platform code:
    1. cd into `mobile-samples/cross-platform/react-app`.
    1. Run `npm install`.
    1. Run `npx relative-deps`. Note: this will build and package `mobile-sdk-core` and `mobile-ui-react` into node_modules. If you ever run `npm install` again, you have to re-run `npx relative-deps`.
    1. Run `npm run build`.
    1. Run `npm run start` to start the React debug server.
1. Open `mobile-samples/iOS/MobileStarter/LocalSDK_MobileStarter.xcodeproj`.
1. Run

## Updates

1. Update sources:
    - Use `git pull` to update `mobile-samples`, `mobile-sdk-ios`, `mobile-sdk-core`, and `mobile-ui-react`.
    - Or make local changes that you're developing.
1. Build cross platform code (with the steps above)
1. Open `mobile-samples/iOS/MobileStarter/LocalSDK_MobileStarter.xcodeproj`.
1. File > Packages > Update to Latest Package Versions
1. Wait for Xcode to download and install any updates to the dependent Swift Packages.
1. Run
