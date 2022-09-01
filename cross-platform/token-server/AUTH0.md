# Auth0 Setup
If you want to run the ThirdPartyAuth samples, you will need to set up an auth0 account and configure it to work with this sample. However, while these samples use auth0, the 3rd party authentication workflow should work the same with any authentication provider. Specifically:

1. Have the user sign in and get a token.
1. Automatically refresh this token as needed.
1. Use this token in the `Authentication` header sent to a custom iTwin access token provider.
1. Create a web service app that runs on a server somewhere.
1. Have this app validate the incoming token to decide whether the user is authorized, and if so to what extent.
1. Return an iTwin service access token based on your authentication of the user.

## Setup
1. Create an client on [auth0](https://auth0.com/).
1. From the auth0 dashboard, select the drop-down in the top left and then select "Create tenant".
1. Create a tenant name that you will be using for the third party auth sample. The other settings should be good with their default values (auto Region and Environment Tag of Development).
1. Hit Create.
1. Select Application from the sidebar.
1. Create Application.
1. Name the application ThirdPartyAuth.
1. Make sure Native is selected as the application type and hit "Create".
1. In the application settings, scroll down to "Allowed Callback URLs" and enter the following values, replacing [TENANT_NAME] with the tenant name chosen above:
    ```
    com.bentley.sample.thirdpartyauth://[TENANT_NAME].us.auth0.com/android/com.bentley.sample.ThirdPartyAuth/callback
    com.bentley.sample.ThirdPartyAuth://[TENANT_NAME].us.auth0.com/ios/com.bentley.sample.ThirdPartyAuth/callback
    ```

    _Note:_ You may have to change `.us` to something else if your region isn't U.S.
1. Enter the same values in the "Allowed Logout URLs" box.
1. Scroll to the bottom and hit "Save Changes".
1. Select APIs in the sidebar
1. Create an api. Name it anything and enter `http://tokenserver.sample.bentley.com` as the identifier. Accept the default for other settings.
