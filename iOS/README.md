# iTwin Mobile SDK iOS Samples

## Consistency Across Modules

These samples make use of the [`itwin-mobile-sdk-ios`](https://github.com/iTwin/mobile-sdk-ios) Swift Package (which itself uses the [`itwin-mobile-native-ios`](https://github.com/iTwin/mobile-native-ios/releases) Swift Package), as well as the `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react` npm modules. In order to work properly, all of these things have to be in sync with each other. When new functionality is added to any of the dependent modules, and that new functionality is used in the samples, the samples won't work until the next official release of the dependent modules. That means that there is a very good chance that the main branch __will not work__ at any given time. To avoid problems when using these samples, you should always check out a release tag.

## Client ID Setup

Before building the samples, you must configure a Client ID for yourself. To do so, follow the instructions [here](../cross-platform/ClientID.md).

## ITMApplication.xcconfig Setup

1. Create a a file named `ITMApplication.xcconfig` in this directory with the following contents:

    ```xcconfig
    ITMAPPLICATION_CLIENT_ID = <Your Client ID>
    ITMAPPLICATION_SCOPE = <Your Scope>
    ```

    Notes:

    * Do not surround your values with quotes.

    * If you already had a Client ID, browse to your app's page in [my-apps](https://developer.bentley.com/my-apps/). If you just created it, you should already be there.

1. Copy your client ID from the app's page, then replace &lt;Your Client ID&gt;.    
1. Use the "Copy" button in the Scopes section of the app's page to copy your scopes to the clipboard. Then replace &lt;Your scope&gt;. Finally, add `offline_access` to the end of the list of scopes (separated from the others with a space).

## NPM Setup

Follow the npm setup instructions [here](../cross-platform/npm.md).

---

## Running the Samples

Once you have performed the above setup, you can build and run the samples.

__Note:__ The samples must currently use Rosetta 2 mode when targeting the iOS Simulator on an Apple Silicon Mac, which requires Xcode 14.3 or later. (This will probably be fixed in the future.) The first time you run on the simulator, you will get a dialog saying the build failed due to a required architecture being missing. Select `Build for Rosetta` in that dialog. You will probably also have to set `ITMAPPLICATION_DISABLE_AUTH = YES` in ITMApplication.xcconfig in order to avoid having it crash during startup. That means that only local iModels can be loaded. You can drag and drop `Snapshot iModels/Building Blocks.bim` onto the running iOS Simulator to open the iTwin Mobile SDK sample model. If running the simulator from the command line instead of Xcode, the `simctl launch` command must be run using `arch -arch x86_64` in order to cause it to use Rosetta 2 mode.

1. Open the appropriate Xcode project or workspace.
1. Xcode will take some time to download the Swift Packages that each sample depends on the first time you open that sample Xcode project. Also, it appears that Xcode sometimes randomly fails when installing Swift Packages. If this happens, select File->Packages->Reset Package Caches.
1. Select the project in the Xcode navigator.
1. Select the only entry under TARGETS.
1. Select the Signing & Capabilities tab.
1. Select your team from the Team popup menu.
1. Use `git diff` to see the team ID value that was added to project.pbxproj after the above change, and then set the `DEVELOPMENT_TEAM` value in ITMApplication.xcconfig to contain that value. You can then revert the change to project.pbxproj.
1. Run.
1. If you get an error dialog that says `Could not connect to React debug server.`, the first thing to try is to uncomment the `ITMAPPLICATION_USE_IP = YES` line in iOSSamples.xcconfig.
1. Once a sample is installed on your device, you can use Finder to copy a Snapshot iModel to the device if you want to open local snapshot models in the sample:
    1. Select your connected device in Finder's left navigation pane.
    1. Select the Files tab.
    1. Drag and drop .bim Snapshot iModel files into the "iTwin Starter" app or the "SwiftUIStarter" app.
1. Please see [Debugging.md](./Debugging.md) for instructions on debugging.

## Organization

The MobileStarter and SwiftUIStarter sample apps are both simple apps that present a full-screen web view. The app UI inside this web view is a React app in the `cross-platform/react-app` directory of this repository.

It is recommended that you use Visual Studio Code to edit your TypeScript code. Opening the `react-app` directory itself in Visual Studio code will generally be the most convenient way to do this. If you do this, you can use Cmd+Shift+B to start the React debug server, and omit using `npm run start` in a Terminal window.

The `project.json` file inside `react-app` contains dependencies for `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react`. It also contains dependencies for all the various iModelJS packages. These latter dependencies are optional (since they are already dependencies of `@itwin/mobile-ui-react`), but if they are omitted, Visual Studio Code will not autocomplete against those packages without first manually importing the desired class or function.
