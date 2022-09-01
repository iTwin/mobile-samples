# ThirdPartyAuth
This sample demonstrates using an iTwin service app so that an iTwin Mobile app can make use of a 3rd party authentication provider. It uses [auth0](https://auth0.com/) for user authentication. The sample uses Jetpack Compose UI to authenticate against an auth0 account and obtain an ID token. It then uses that ID token as the authentication when communicating with a demo iTwin token provider server running on the developer's computer. The token provider server validates that the token is from the proper auth0 domain, and then uses a client secret that was created during the registration of the iTwin service app to generate an iTwin access token.

If you want to run the sample, you will need to set up an auth0 account and configure it to work with this sample. However, while this sample uses auth0, the 3rd party authentication workflow should work the same with any authentication provider. Specifically:

1. Have the user sign in and get a token.
1. Automatically refresh this token as needed.
1. Use this token in the `Authentication` header sent to a custom iTwin access token provider.
1. Create a web service app that runs on a server somewhere.
1. Have this app validate the incoming token to decide whether the user is authorized, and if so to what extent.
1. Return an iTwin service access token based on your authentication of the user.

## Setup

1. Follow the instructions in the [Android Readme](../README.md).
1. Create an client on [auth0](https://auth0.com/).
1. From the auth0 dashboard, select the drop-down in the top left and then select "Create tenant".
1. Create a tenant name that you will be using for the third party auth sample. The other settings should be good with their default values (auto Region and Environment Tag of Development).
1. Hit Create.
1. Select Application from the sidebar.
1. Create Application.
1. Name the application ThirdPartyAuth.
1. Make sure Native is selected as the application type and hit "Create".
1. In the application settings, scroll down to "Allowed Callback URLs".
1. Enter the following URL, replacing [TENANT_NAME] with the tenant name chosen above:

    `com.bentley.sample.thirdpartyauth://[TENANT_NAME].us.auth0.com/android/com.bentley.sample.ThirdPartyAuth/callback`

    _Note:_ You may have to change `.us` to something else if your region isn't U.S.
1. Enter the same URL in the "Allowed Logout URLs" box.
1. Scroll to the bottom and hit "Save Changes".
1. Select APIs in the sidebar
1. Create an api. Name it anything and enter `http://tokenserver.sample.bentley.com` as the identifier. Accept the default for other settings.
1. Add the following environment variables to your ITMSamples.properties file and configure them to match the above auth0 client:
    ```
    itmsample.auth0_client_id
    itmsample.auth0_domain
    itmsample.auth0_audience
    ```
1. Add `itmsample.token_server_url` to the ITMSamples.properties file so the sample app knows where to find the token server. The initital value `http://10.0.2.2:3001` should work from an emulator, but will need to be adjusted if running from a device.
1. Follow the instructions in the [Token Server Readme](../../cross-platform/token-server/README.md).
1. Open the ThirdPartyAuth folder (where this README.md file resides) in Android Studio.
1. Sync project with gradle files, build, and run.
1. Hit Log in
1. Select "Sign up" and create an account.
