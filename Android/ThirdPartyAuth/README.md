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
1. Follow the instructions to setup auth0 in the [Auth0 Readme](../../cross-platform/token-server/AUTH0.md)
1. Add the following environment variables to your ITMSamples.properties file and configure them to match the auth0 client:
    ```
    itmsample.auth0_client_id
    itmsample.auth0_domain
    itmsample.auth0_audience
    ```
1. Add `itmsample.token_server_url` to the ITMSamples.properties file so the sample app knows where to find the token server. The initital value `http://10.0.2.2:3001` should work from an emulator, but will need to be adjusted if running from a device.
    
    _Note:_ The `itmsample.*` variables in the above steps will be accessible as resources via R.string in the native Android code.

1. Follow the instructions in the [Token Server Readme](../../cross-platform/token-server/README.md).
1. Open the ThirdPartyAuth folder (where this README.md file resides) in Android Studio.
1. Sync project with gradle files, build, and run.
1. Hit Log in.
1. Select "Sign up" and create an account.

