# iTwin Mobile SDK Android Samples

## Consistency Across Modules

These samples make use of the iTwin [`mobile-sdk-android`](https://github.com/iTwin/mobile-sdk-android) package (which itself uses the iTwin [`mobile-native-android`](https://github.com/iTwin/mobile-native-android/releases) package), as well as the `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react` npm modules. In order to work properly, all of these things have to be in sync with each other. When new functionality is added to any of the dependent modules, and that new functionality is used in the samples, the samples won't work until the next official release of the dependent modules. That means that there is a very good chance that the main branch __will not work__ at any given time. To avoid problems when using these samples, you should always check out a release tag.

## Client ID Setup

Before building the samples, you must configure a Client ID for yourself. To do so, follow the instructions [here](../cross-platform/ClientID.md).

## ITMSamples.properties Setup

1. In the `Android/Shared` directory, copy the file `example-ITMSamples` and rename it to `ITMSamples.properties`. You will need to configure `itmapplication.client_id` and `itmapplication.scope`.

    Notes:

    * Do not surround your values with quotes.

    * If you already had a Client ID, browse to your app's page on developer.bently.com. If you just created it, you should already be there.

1. Copy your client ID from the app's page, then replace `YOUR_CLIENT_ID`.
1. Use the "Copy" button in the Scopes section of the app's page to copy your scopes to the clipboard. Then replace `YOUR_SCOPE`.

## NPM Setup

Follow the npm setup instructions [here](../cross-platform/npm.md).

---

## Running the Samples

Once you have performed the above setup, you can build and run the samples.

1. Open the desired sample in Android Studio.
1. Wait for Gradle to download all the dependencies.
1. Run on either a connected Android device, or an appropriate emulator.
1. If you get an error dialog that says `Could not connect to React debug server.`, the first thing to try is to uncomment the `itm.debug_use_ip=YES` line in ITMSamples.properties.
1. Please see [Debugging.md](./Debugging.md) for instructions on debugging.

## Organization

The iTwinStarter sample app is a simple app that present a full-screen web view. The app UI inside this web view is a React app in the `cross-platform/react-app` directory of this repository.

It is recommended that you use Visual Studio Code to edit your TypeScript code. Opening the `react-app` directory itself in Visual Studio code will generally be the most convenient way to do this. If you do this, you can use Ctrl+Shift+B (Cmd+Shift+B on Mac) to start the React debug server, and omit using `npm run start` in a Command Prompt/Terminal window.

The `project.json` file inside `react-app` contains dependencies for `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react`. It also contains dependencies for all the various iModelJS packages. These latter dependencies are optional (since they are already dependencies of `@itwin/mobile-ui-react`), but if they are omitted, Visual Studio Code will not autocomplete against those packages without first manually importing the desired class or function.
