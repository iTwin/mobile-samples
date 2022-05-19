# Token Server

The goal of the this token server is to provide an example of how to implement a two-legged authentication workflow for interacting with the iTwin Platform and configure it for the iTwin Mobile ThirdPartyAuth Sample.

This server holds the client secret created for your application and manages issuing the token to a client-side application that will allow access to the
the iTwin Platform. This will enforce a secure workflow when implementing the [client credentials workflow](https://developer.bentley.com/apis/overview/authorization/#clientcredentialflow).

> __Important__: It is strongly recommended that this server be placed behind a layer of authorization and/or authentication that fits your workflow and validates the user has access to get the token required. However, to simplify the example, this server simply verifies that the request has a valid auth0 token from the domain specified in the `ITM_TOKEN_SERVER_AUTH0_DOMAIN` environment variable. Similarly, the server itself is an http server. Any token server you deploy in the real world would use https.

## Set up the environment

This token server requires certain values to be present in the environment at run-time. While you can set these environment variables before running the server, it is recommended that you instead use a file named .env.local to contain the values. Copy [.env](./.env) to .env.local, and then fill in the values. Fill in `ITM_TOKEN_SERVER_CLIENT_ID` and `ITM_TOKEN_SERVER_CLIENT_SECRET` with the values created during [client registration](../ClientID.md). Set up an auth0 domain with auth0.com and put it in the `ITM_TOKEN_SERVER_AUTH0_DOMAIN` environment variable.

## Run

Run the following commands from a command prompt/terminal:

1. `npm install`
1. `npm run build`
1. `npm start`

> __Note__: By default the server runs on port 3001. You can configure it to use a different port by setting `ITM_TOKEN_SERVER_PORT` in `.env.local`

## Set up ThirdPartyAuth sample

### iOS

Follow the instructions [here](../../iOS/ThirdPartyAuth/README.md) to configure and run the third party auth sample.

If a custom port is defined for the token server, make sure to use that port in the `ITMSAMPLE_TOKEN_SERVER_URL` value for the sample.

### Android

Forthcoming.