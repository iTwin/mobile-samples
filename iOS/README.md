# iTwin Mobile SDK iOS Samples

## Consistency Across Modules

These samples make use of the [`itwin-mobile-sdk-ios`](https://github.com/iTwin/mobile-sdk-ios) Swift Package (which itself uses the [`itwin-mobile-native-ios`](https://github.com/iTwin/mobile-native-ios/releases) Swift Package), as well as the `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react` npm modules. In order to work properly, all of these things have to be in sync with each other. When new functionality is added to any of the dependent modules, and that new functionality is used in the samples, the samples won't work until the next official release of the dependent modules. That means that there is a very good chance that the main branch __will not work__ at any given time. To avoid problems when using these samples, you should always check out a release tag.

## Client ID Setup

Before building the samples, you must configure a Client ID for yourself. To do so, do the following:

1. If you have not already done so, [create a Bentley Account](./BentleyAccount.md).
1. Go to <https://developer.bentley.com/my-apps/>.
1. Click the "Register New" button.
1. Pick a name.
1. Check the check boxes next to "Visualization", "Administration", and "Digital Twin Management".
1. Remove the following scopes by selecting the X next to them:
    * library:modify
    * realitydata:modify
    * library:read
    * imodels:modify
    * storage:modify
    * storage:read
    * projects:modify
    * users:read
1. Select "Desktop/Mobile" as the application type.
1. Enter `imodeljs://app/signin-callback` for "Redirect URIs".
1. Enter `imodeljs://app/signout-callback` for "Post logout redirect URIs".
1. Save.
1. Select your newly generated app. You will see that it has a Client ID, and Scopes.

## ITMApplication.xcconfig Setup

1. Create a a file named `ITMApplication.xcconfig` in this directory with the following contents:

    ```xcconfig
    ITMAPPLICATION_CLIENT_ID = <Your Client ID>
    ITMAPPLICATION_SCOPE = <Your Scope>
    ```

    Notes:

    * Do not surround your values with quotes.

    * If you already had a Client ID, browse to your app's page on developer.bently.com. If you just created it, you should already be there.

1. Copy your client ID from the app's page, then replace &lt;Your Client ID&gt;.    
1. Use the "Copy" button in the Scopes section of the app's page to copy your scopes to the clipboard. Then replace &lt;Your scope&gt;.

## NPM Setup

1. You must install node 14 on your Mac, and it needs to be the default node found in your path.
1. If you are using a Mac with Apple Silicon, you must do the following:
    1. Run a Rosetta 2 Terminal.
    1. cd into the `iOS/MobileStarter/react-app` directory of this repository.
    1. Run `npm install`.
1. Run a Terminal
1. cd into the `iOS/MobileStarter/react-app` directory of this repository.
1. If you are not on a Mac with Apple Silicon and did so above, run `npm install`.
1. Run `npm run build`.
1. Run `npm run start`. __Note:__ This starts a React Debug Server on your Mac that the app will communicate with. It must be running when you run the app. This requires that the device be able to connect to your Mac. If you want the app to run purely on the device (like it would if it were released), uncomment the `ITMAPPLICATION_NO_DEBUG_SERVER = YES` line in iOSSamples.xcconfig. If you do this, there is no need for the React Debug Server to be running when you run the app. (If you open the react-app directory in Visual Studio Code, it is configured such that Cmd+Shift+B will perform the `npm run start` in an integrated terminal.)

---

## Running the Samples

Once you have performed the above setup, you can build and run the samples.

__Note:__ The samples cannot currently be built for or run on the iOS Simulator on an Apple Silicon Mac. This will be fixed in the future, but for the moment if you are using a Mac with an Apple Silicon processor, you can only build for and run on a connected iOS device.

1. Open the appropriate Xcode project.
1. Xcode will take some time to download the Swift Packages that each sample depends on the first time you open that sample Xcode project. Also, it appears that Xcode sometimes randomly fails when installing Swift Packages. If this happens, select File->Packages->Reset Package Caches.
1. Select the project in the Xcode navigator.
1. Select the only entry under TARGETS.
1. Select the Signing & Capabilities tab.
1. Select your team from the Team popup menu.
1. Run.
1. If you get an error dialog that says `Could not connect to React debug server.`, the first thing to try is to uncomment the `ITMAPPLICATION_USE_IP = YES` line in iOSSamples.xcconfig.
1. Once a sample is installed on your device, you can use Finder to copy a Snapshot iModel to the device if you want to open local snapshot models in the sample:
    1. Select your connected device in Finder's left navigation pane.
    1. Select the Files tab.
    1. Drag and drop .bim Snapshot iModel files into the "iTwin Starter" app or the "SwiftUIStarter" app.
1. Please see [Debugging.md](./Debugging.md) for instructions on debugging.

## Organization

The MobileStarter and SwiftUIStarter sample apps are both simple apps that present a full-screen web view. The app UI inside this web view is a React app in the `react-app` directory of each sample app. The `react-app` directory in the SwiftUIStarter sample app is just a symbolic link to the `react-app` directory in the MobileStarter sample app.

It is recommended that you use Visual Studio Code to edit your TypeScript code. Opening the `react-app` directory itself in Visual Studio code will generally be the most convenient way to do this. If you do this, you can use Cmd+Shift+B to start the React debug server, and omit using `npm run start` in a Terminal window.

The `project.json` file inside `react-app` contains dependencies for `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react`. It also contains dependencies for all the various iModelJS packages. These latter dependencies are optional (since they are already dependencies of `@itwin/mobile-ui-react`), but if they are omitted, Visual Studio Code will not autocomplete against those packages without first manually importing the desired class or function.
