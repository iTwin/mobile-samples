# NPM Setup

1. You must install node 18 on your computer, and it needs to be the default node found in your path.
1. Run a Command Prompt/Terminal.
1. cd into the `cross-platform/react-app` directory of this repository.
1. Run `npm install`.
1. Run `npm run build`.
1. Run `npm run start`. __Note:__ This starts a React Debug Server on your computer that the app will communicate with. It must be running when you run the app. This requires that the device be able to connect to your computer. If you want the app to run purely on the device (like it would if it were released), uncomment the `ITMAPPLICATION_NO_DEBUG_SERVER = YES` line in iOSSamples.xcconfig, or the `itm.no_debug_server` line in ITMSamples.properties. If you do this, there is no need for the React Debug Server to be running when you run the app. (If you open the react-app directory in Visual Studio Code, it is configured such that Cmd+Shift+B will perform the `npm run start` in an integrated terminal.)
