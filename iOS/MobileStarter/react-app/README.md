# Instructions for locally building the MobileStarter app 

Note: These are temporary build instructions for getting these samples running.

## Initial checkout and build

1. cd into <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm install`.
1. Check out https://github.com/iTwin/mobile-core into <span style="font-family: monospace">mobile-core</span> alongside <span style="font-family: monospace">mobile-sdk-samples</span>.
1. cd into <span style="font-family: monospace">mobile-core</span>.
1. Run `npm install`. (Note that my system node is node 14.x. Not sure how important that is.)
1. Run `export ITM_TEST_APP_DIR=../mobile-sdk-samples/iOS/MobileStarter/react-app`
1. Run `npm run build:debug`. Note: this will copy the build into the react-app node_modules. This is required in order for things to work. react-app above is configured with a relative path to mobile-core and mobile-ui-react, but npm install creates symlinks, and that does not work. If you ever run npm install again in the react-app directory above, you have to re-copy the mobile-core and mobile-ui-react output. This can be done by running the `syncToTestApp.sh` shell script from mobile-core, and is done automatically when you use the build:debug npm script.
1. Check out https://github.com/iTwin/mobile-ui-react into <span style="font-family: monospace">mobile-ui-react</span> alongside <span style="font-family: monospace">mobile-sdk-samples</span>.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm install`
1. Run `npm run build:debug`.
1. cd back to <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm run build`
1. Run `npm run start` to start the React debug server
1. Open <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/MobileStarter.xcodeproj</span>.
1. Wait for Xcode to download and install the dependent Swift Packages (which includes the arm64 iModelJS framework).
1. Create <span style="font-family: monospace">mobile-sdk-samples/iOS/ITMApplication.xcconfig</span>. It should look something like the following (with your own client ID replacing `<Your Client ID goes here.>`):

    ```
    ITMAPPLICATION_CLIENT_ID = <Your Client ID goes here.>
    ITMAPPLICATION_SCOPE = email openid profile organization itwinjs
    ITMAPPLICATION_USE_IP = YES
    ```

1. Cross Fingers.
1. Run

## Updates

1. Use `git pull` to update <span style="font-family: monospace">mobile-sdk-samples</span>, <span style="font-family: monospace">mobile-core</span>, and <span style="font-family: monospace">mobile-ui-react</span>.
1. cd into <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm install`.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm install`
1. cd into <span style="font-family: monospace">mobile-core</span>.
1. Run `npm install`.
1. Run `export ITM_TEST_APP_DIR=../mobile-sdk-samples/iOS/MobileStarter/react-app`
1. Run `npm run build:debug`.
1. cd into <span style="font-family: monospace">mobile-ui-react</span>.
1. Run `npm run build:debug`.
1. cd into <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/react-app</span>.
1. Run `npm run build`
1. Run `npm run start` to start the React debug server
1. Open <span style="font-family: monospace">mobile-sdk-samples/iOS/MobileStarter/MobileStarter.xcodeproj</span>.
1. File->Swift Packages->Update to Latest Package Versions
1. Wait for Xcode to download and install any updates to the dependent Swift Packages.
1. Run