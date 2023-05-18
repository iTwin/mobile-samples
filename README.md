# iTwin mobile-samples

Copyright © Bentley Systems, Incorporated. All rights reserved. See [LICENSE.md](./LICENSE.md) for license terms and full copyright notice.

## Warning

This is pre-release software and provided as-is.

## About this Repository

This repository contains sample Android and iOS apps that make use of the iTwin Mobile SDK.

There are four iOS sample apps:

- **MobileStarter** is a UIKit app containing a full-screen WKWebView running Typescript code to host the iTwin content.
- **SwiftUIStarter** is a SwiftUI app that similarly runs a WKWebView to host the iTwin content.
- **CameraSample** demonstrates how to make calls to native iOS code to take or select a picture.
- **ThirdPartyAuth** demonstrates how to use a third party for user authentication.

Each iOS sample app includes an Xcode project with a LocalSDK\_ prefix. These Xcode projects are the same as the main ones, with the exception that they refer to a local filesystem copy of mobile-sdk-ios, instead of referring to the mobile-sdk-ios Swift Package on GitHub.

There are three Android sample apps:

- **iTwinStarter** is an app containing an Android WebView running TypeScript code to host the iTwin content.
- **CameraSample** demonstrates how to make calls to native Android code to take or select a picture.
- **ThirdPartyAuth** demonstrates how to use a third party for user authentication.

There is one React Native sample app:

- **iTwinRNStarter** is a React Native app with a WebView running TypeScript code to host the iTwin content.

See [iOS/README.md](./iOS/README.md) for instructions on building the iOS samples.

See [Android/README.md](./Android/README.md) for instructions on building the Android samples.

See [ReactNative/README.md](./ReactNative/README.md) for instructions on building the React Native sample.

See [OFFLINE.md](./OFFLINE.md) for information about using iModels while offline.

## Sample iModels

The `Snapshot iModels` directory contains sample snapshot iModels that can be copied into the app on the device. Right now, there is only one sample: `Building Blocks.bim`. On a Windows PC, you can use iTunes to copy the file, and on a Mac you can use Finder. Once it has been copied to the app on the device, it will show up in the Snapshot iModels screen of the app. If you are already on that screen while you copy the file, hit the refresh button in the upper right to refresh the list.
