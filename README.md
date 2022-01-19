# iTwin mobile-sdk-samples

Copyright © Bentley Systems, Incorporated. All rights reserved. See [LICENSE.md](./LICENSE.md) for license terms and full copyright notice.

## Warning

This is pre-release software and provided as-is.

## About this Repository

This repository contains sample iOS apps that make use of the iTwin Mobile SDK.

There are two sample apps, MobileStarter and SwiftUIStarter. The former is a UIKit app, and the later is a SwiftUI app. Both contain a full-screen WKWebView to host the iTwin content, and make use of the same TypeScript code running inside that WKWebView.

Each sample app includes an Xcode project with a LocalSDK_ prefix. These Xcode projects are the same as the main ones, with the exception that they refer to a local filesystem copy of mobile-sdk-ios, instead of referring to the mobile-sdk-ios Swift Package on GitHub.

See [iOS/README.md](./iOS/README.md) for instructions on building the samples.

## Sample iModels

The `Snapshot iModels` directory contains sample snapshot iModels that can be copied into the app on the device. Right now, there is only one sample: `Building Blocks.bim`. On a Windows PC, you can use iTunes to copy the file, and on a Mac you can use Finder. Once it has been copied to the app on the device, it will show up in the Snapshot iModels screen of the app. If you are already on that screen while you copy the file, hit the refresh button in the upper right to refresh the list.