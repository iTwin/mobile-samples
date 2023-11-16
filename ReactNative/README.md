# iTwin Mobile SDK React Native Sample

This React Native sample works like the [iOS](../iOS/README.md) and [Android](../Android/README.md) samples, with a few differences.

__Note:__ This sample is designed to show you how to use the iTwin Mobile SDK in a React Native app. However, unlike the iOS and Android samples, it is strongly recommended that you __do not__ use this sample as a basis for a new app. In addition to increasing the download size of your app, React Native has its own JavaScript runtime that is completely separate from the iTwin.js JavaScript runtime. Both runtimes consume significant memory, so we only recommend this approach when adding iTwin.js to an existing non-trivial React Native app. For apps that just present a full-screen web view to the user into which the iTwin-based web app is loaded, React Native does not provide much benefit.

## React Native App NPM Setup

1. You must install node 18 on your computer, and it needs to be the default node found in your path.
1. Run a Command Prompt/Terminal.
1. cd into the `ReactNative/iTwinRNStarter` directory of this repository.
1. Run `npm install`.

## Running the iOS Sample

1. Run Terminal.
1. cd into the `ReactNative/iTwinRNStarter/ios` directory of this repository.
1. Run `pod install`.
1. Follow the iOS samples instructions [here](../iOS/README.md). __Note__: Instead of opening the xcodeproj for the React Native sample, you _must_ open the xcworkspace. The workspace file is `ReactNative/ios/iTwinRNStarter.xcworkspace`.

## Running the Android Sample

Follow the Android samples instructions [here](../Android/README.md). The Android sample is in `ReactNative/android`.