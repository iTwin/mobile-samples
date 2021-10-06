# iTwin Mobile SDK iOS Samples

## Setup

Before building the samples, you must configure a Client ID for yourself. To do so, do the following:

1. If you have not already done so, [create a Bentley Account](./BentleyAccount.md).
1. Go to <https://developer.bentley.com/my-apps/>.
1. Click the "Register New" button.
1. Pick a name.
1. Check the check box next to "Visualization".
1. Select "Desktop/Mobile" as the application type.
1. Enter `imodeljs://app/signin-callback` for "Redirect URIs".
1. Enter `imodeljs://app/signout-callback` for "Post logout redirect URIs".
1. Save.
1. Select your newly generated app. You will see that it has a Client ID, and Scopes.
1. Create a a file named `ITMApplication.xcconfig` in this directory with the following contents (replacing parts in angle brackets):

    ```xcconfig
    ITMAPPLICATION_CLIENT_ID = <Your Client ID>
    ITMAPPLICATION_SCOPE = <Your Scope>
    ```

    Note: You can use the "Copy" button in the Scopes section to copy your scopes to the clipboard.
1. You must install node 14 on your Mac, and it needs to be the default node found in your path.
1. If you are using a Mac with Apple Silicon, you must run a Rosetta 2 Terminal, then cd into the `iOS/MobileStarter/react-app` directory of this repository, then run `npm install`.


---

## Running the Samples

Once you have performed the above setup, you can build and run the samples. Simply open the appropriate Xcode project and run. Once a sample is installed on your device, you can use Finder to copy a Snapshot iModel to the device if you want to open local snapshot models in the sample:

1. Select your connected device in Finder's left navigation pane.
1. Select the Files tab.
1. Drag and drop .bim Snapshot iModel files into the "iTwin Starter" app or the "SwiftUIStarter" app.
