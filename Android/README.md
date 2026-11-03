# iTwin Mobile SDK Android Samples

## Consistency Across Modules

These samples make use of the iTwin [`mobile-sdk-android`](https://github.com/iTwin/mobile-sdk-android) package (which itself uses the iTwin [`mobile-native-android`](https://github.com/iTwin/mobile-native-android/releases) package), as well as the `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react` npm modules. In order to work properly, all of these packages have to be in sync with each other. When new functionality is added to any of the dependent modules, and that new functionality is used in the samples, the samples won't work until the next official release of the dependent modules. That means that there is a very good chance that the main branch __will not work__ at any given time. To avoid problems when using these samples, you should always check out a release tag.

## Client ID Setup

Before running any samples, you must configure a Client ID for yourself. To do so, follow the instructions [here](../cross-platform/ClientID.md).

### Android-specific Client IDs

For the Android samples, you need to create a custom redirect URI for each one that you want to run. To do that:

1. Go to <https://developer.bentley.com/my-apps/>.
1. Select the application that you created above.
1. Hit the `+` to the right of the last Redirect URI.
1. Enter the sample-specific redirect URI. The URIs are:
    * iTwinStarter: `com.bentley.sample.itwinstarter://app/signin-callback`
    * CameraSample: `com.bentley.sample.camera://app/signin-callback`
    * ThirdPartyAuth: `com.bentley.sample.thirdpartyauth://app/signin-callback`
1. Hit `Save`.

## ITMSamples.properties Setup

1. In the `Android/Shared` directory, copy the file `example-ITMSamples.properties` and rename the copy to `ITMSamples.properties`. You will need to configure `itmapplication.client_id` and `itmapplication.scope`.

    Notes:

    * Do not surround your values with quotes.

    * If you already had a Client ID, browse to your app's page in [my-apps](https://developer.bentley.com/my-apps/). If you just created it, you should already be there.

1. Copy your client ID from the app's page, then replace `YOUR_CLIENT_ID`.
1. Use the "Copy" button in the Scopes section of the app's page to copy your scopes to the clipboard. Then replace `YOUR_SCOPE`. Finally, add `offline_access` to the end of the list of scopes (separated from the others with a space).

## NPM Setup

Follow the npm setup instructions [here](../cross-platform/npm.md).

---

## GitHub Packages Gradle Registry Setup

To use the published versions of the iTwin Mobile SDK packages, you need to [create a Personal Access Token (PAT) on GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) with the `read:packages` scope selected, and then add the following setting to local.properties for each of the sample(s) you plan to run:

    gpr.key=GITHUB_PAT

Replace `GITHUB_PAT` with the your GitHub PAT.

__Note:__ If you a member of the iTwin organization on GitHub, you must authorize your PAT for SSO use. To do that, select "Configure SSO" on the PAT, and authorize the iTwin organization.

## Local Maven Setup

If you want to do local development of `iTwin/mobile-sdk-android`, please follow the instructions in CONTRIBUTING.md in that repository.

## Running the Samples

Once you have performed the above setup, you can build and run the samples.

1. Open the desired sample in Android Studio.
1. Select whatever JDK you want to use.
1. Wait for Gradle to download all the dependencies.
1. Run on either a connected Android device, or an appropriate emulator.
1. If you get an error dialog that says `Could not connect to React debug server.`, make sure that your React debug server is running (from the end of the npm setup instructions). If it is, the next thing to try is to uncomment the `itm.debug_use_ip=YES` line in ITMSamples.properties.
1. Please see [Debugging.md](./Debugging.md) for instructions on debugging.

### SDK Tests (Debug Builds Only)

Install a debug sample build and open its additional **SDK Tests** launcher entry. Each suite has its own play button; select **Console bridge** to run the console checks. Tests run only when requested, in a separate WebView; the sample frontend is not navigated or modified. Results appear on screen and in Logcat under `SDKTests`. Release builds do not include the test Activity, launcher entry, or fixtures.

The tests use the sample's iTwin Mobile SDK for Android dependency (`mobile-sdk-android`). To test local changes to that library, publish the matching version to Maven Local first (see Local Maven Setup above), run **Sync Project with Gradle Files** (the elephant icon) in Android Studio after each publish, then rebuild and run the sample. The **Console bridge** option needs no server: both HTTPS test origins are intercepted locally and network loads are blocked in the test WebView.

For **Console bridge (debug server)**, set `itm.no_debug_server=NO` in `Shared/ITMSamples.properties`, ensure `itm.debug_host` or automatic IP selection identifies a reachable address for your Mac, and rebuild. Run `npm run start` from `cross-platform/react-app`. This option reads `ITMAPPLICATION_BASE_URL` from the generated app configuration and loads `/sdk-tests/` fixtures over real HTTP from that Vite server; it does not intercept requests or fall back to packaged fixtures. For the foreign-origin probes, forward the server port with `adb reverse tcp:3000 tcp:3000` (adjust for a non-default port). The trusted origin is the configured server; the foreign origin uses the same port on `127.0.0.1`, or `localhost` if the configured host is already `127.0.0.1`.

To launch a specific suite explicitly from the command line after installing iTwinStarter:

```sh
adb shell am start -S -n com.bentley.sample.itwinstarter/com.bentley.sample.shared.SDKTestsActivity --es sdk-test-suite console-bridge-debug-server
```

Use `console-bridge` for packaged fixtures, or omit the extra to wait for a play-button tap.

The console suite checks trusted console forwarding, log levels/assertions/window errors, direct bridge access from foreign-origin, same-origin, and opaque sandboxed frames, wrong/stale sessions, malformed and oversized payloads, rate limiting, repeated injection, foreign main-frame navigation, and detach cleanup. Frame probes report that they executed; rejected calls are observed for a bounded interval, rather than treating an unloaded frame as a pass. Same-origin frames intentionally call their own bridge, not their parent's: same-origin scripts can access the parent and are not an isolation boundary.

Register additional suites in the `suites` collection in `SDKTestsActivity`; each entry receives its own play button. Keep their sources and fixtures under `Shared/src/debug`.

#### Geolocation Emulator Setup

Before building the debug APK, check out the matching `mobile-sdk-core` source beside `mobile-samples` (the fixture builder reads `../mobile-sdk-core/src/mobile-sdk-core/Geolocation.ts` relative to the repository root). Complete the npm setup above, then generate the fixtures from `cross-platform/react-app`:

```sh
npm run build:sdk-test-fixtures
```

This generates the ignored `geolocation.js` polyfill bundle used by the suite. Normal npm and Gradle builds do not generate it. Regenerate after changing the core polyfill, then rebuild the APK.

Before running the **Geolocation** suite on a fresh emulator, enable device location and accept the Google **Location Accuracy** prompt by selecting **Turn on**. Granting the app location permission alone does not satisfy this device-level setting. A lookup can remain pending while the dialog is open, causing the suite to time out.

For initial setup, use a visible emulator. When the [location-test runner](../cross-platform/react-app/scripts/run-location-tests.mjs) starts an emulator with `--avd=<name>`, add `--show-window` so you can respond to the prompt. After accepting it, subsequent runs can use the same AVD headlessly.

The suite requires specific simulated coordinates and movement; pressing play with location enabled is not sufficient. To automate location injection and suite launch, run this from `cross-platform/react-app` with a booted emulator and the debug APK built:

```sh
node scripts/run-location-tests.mjs android emulator-5554
```

Replace the serial if needed. The runner installs the default iTwinStarter debug APK, grants app location permission, and expects all eight checks to pass.

To run manually:

1. Grant the app location permission and inject the initial fix before pressing **Geolocation (See README.md)**:
    ```sh
    adb -s emulator-5554 emu geo fix -122.0090 37.3349
    ```
2. Repeat the fix roughly once per second through the initial tests, alternating latitude between `37.3349` and `37.33491` to provide continuing updates.
3. When Logcat reports `SDKTests: READY: location change`, switch to:
    ```sh
    adb -s emulator-5554 emu geo fix -121.9990 37.3449
    ```
4. Continue injecting roughly once per second until completion, alternating latitude between `37.3449` and `37.34491`. The remaining-watch check needs updates after the first watch is cleared.

The emulator command takes **longitude before latitude**. Each expected lookup or update has a 30-second timeout. Missing fixes can cause timeouts; unrelated location presets fail the coordinate checks. Success is `Result: 8/8 passed`.

## Organization

The iTwinStarter sample app is a simple app that presents a full-screen web view. The app UI inside this web view is a React app in the `cross-platform/react-app` directory of this repository.

It is recommended that you use Visual Studio Code to edit your TypeScript code. Opening the `react-app` directory itself in Visual Studio code will generally be the most convenient way to do this. If you do this, you can use Ctrl+Shift+B (Cmd+Shift+B on Mac) to start the React debug server, and omit using `npm run start` in a Command Prompt/Terminal window.

The `project.json` file inside `react-app` contains dependencies for `@itwin/mobile-sdk-core` and `@itwin/mobile-ui-react`. It also contains dependencies for all the various iModelJS packages. These latter dependencies are optional (since they are already dependencies of `@itwin/mobile-ui-react`), but if they are omitted, Visual Studio Code will not autocomplete against those packages without first manually importing the desired class or function.
