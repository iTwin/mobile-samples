# ThirdPartyAuth

This sample demonstrates using an iTwin service app so that an iTwin Mobile app can make use of a 3rd party authentication provider. It uses [auth0](https://auth0.com/) for user authentication, signing into an account set up there using native SwiftUI to obtain an ID token. It then uses that ID token as the authentication when communicating with a demo iTwin token provider server running on the developer's Mac. The token provider server validates that the token is from the proper auth0 domain, and then uses a client secret that was created during the registration of the iTwin service app to generate an iTwin access token.

## Setup

1. Follow the instructions in the [iOS Readme](../README.md).
1. Create an client on [auth0](https://auth0.com/).
1. Add the following environment variables to you ITMApplication.xcconfig file and configure them to match the above auth0 client:
    ```
    ITMSAMPLE_TOKEN_SERVER_URL
    ITMSAMPLE_AUTH0_CLIENT_ID
    ITMSAMPLE_AUTH0_DOMAIN
    ITMSAMPLE_AUTH0_AUDIENCE
    ```
1. Follow the instructions in the [Token Server Readme](../../cross-platform/token-server/README.md).
1. Open ThirdPartyAuth.xcodeproj.
1. Run.