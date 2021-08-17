1. cd into <span style="font-family: monospace">itwin-samples/mobilesdk-samples/iOS/MobileStarter/react-app</span>.
2. Run `npm install`. (Note that my system node is node 14.x. Not sure how important that is.)
3. cd into <span style="font-family: monospace">itwin-samples/itwin-mobileui-react</span>.
4. Run `npm install`
5. run `export ITM_TEST_APP_DIR=../mobilesdk-samples/iOS/MobileStarter/react-app`
6. Run `npm run build:debug`. Note: this will copy the build into the react-app node_modules. This is required in order for things to work. react-app above is configured with a relative path to itwin-mobileui-react, but npm install creates a symlink, and that does not work. If you ever run npm install again in the react-app directory above, you have to re-copy the itwin-mobileui-react output. This can be done by running the `syncToTestApp.sh` shell script, and is done automatically when you use the build:debug npm script.
7. cd back to <span style="font-family: monospace">itwin-samples/mobilesdk-samples/iOS/MobileStarter/react-app</span>.
8. Run `npm run build`
9. Run `./GenITMAppConfig.sh`
10. Run `npm run start` to start the React debug server
11. Open <span style="font-family: monospace">itwin-samples/mobilesdk-samples/iOS/MobileStarter/MobileStarter.xcodeproj</span>.
12. Wait for Xcode to download and install the dependent Swift Packages (which includes the arm64 iModelJS framework).
13. Cross Fingers.
14. Run
