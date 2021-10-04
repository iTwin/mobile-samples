# iTwin mobile-sdk-samples

Copyright © Bentley Systems, Incorporated. All rights reserved. See [LICENSE.md](./LICENSE.md) for license terms and full copyright notice.

## Warning

This is pre-release software and provided as-is.

## About this Repository

This repository contains sample iOS apps that make use of the iTwin mobile-sdk.

There are two sample apps, MobileStarter and SwiftUIStarter. The former is a UIKit app, and the later is a SwiftUI app. Both contain a full-screen WKWebView to host the iTwin content, and make use of the same TypeScript code running inside that WKWebView.

Each sample app includes an Xcode project with a LocalSDK_ prefix. These Xcode projects are the same as the main ones, with the exception that they refer to a local filesystem copy of mobile-sdk, instead of referring to the mobile-sdk Swift Package on GitHub.

See [iOS/README.md](./iOS/README.md) for instructions on building the samples.
