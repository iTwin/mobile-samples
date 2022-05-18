# Token Server

The goal of the this token server is to provide an example of how to implement a two-legged authentication workflow for interacting with the iTwin Platform and configure it for the iTwin Mobile Sample.

This server holds the client secret created for your application and manages issuing the token to a client-side application that will allow access to the
the iTwin Platform. This will enforce a secure workflow when implementing the [client credentials workflow](https://developer.bentley.com/apis/overview/authorization/#clientcredentialflow).

> __Important__: It is strongly recommended that this server be placed behind a layer of authorization and/or authentication that fits your workflow and validates the user has access to get the token required. However to simplify the example, this server simply verifies that the request has a valid auth0 token from the domain specified in the AUTH0_DOMAIN environment variable. Similarly, the server itself is an http server. Any token server you deploy in the real world would use https.

## Setup token server

Use the ITM_TOKEN_SERVER_CLIENT_ID and ITM_TOKEN_SERVER_CLIENT_SECRET created in the [client registration](../ClientID.md) to populate the values in the `.env` (or better yet a copy of that renamed to `.env.local`).

Set up an Auth0 domain with auth0.com and put it in the ITM_TOKEN_SERVER_AUTH0_DOMAIN environment variable.

Run,

- `npm install`
- `npm run build`
- `npm start`
- Note the port the server starts on, that will be used when configuring the Viewer.
  - The PORT can be configured by setting the `ITM_TOKEN_SERVER_PORT` in the `.env`

## Setup the iTwin Viewer to use the proxy

To configure the viewer to use the token server, make the following change to the `Viewer` component in [App.tsx](../react-viewer/src/App.tsx):

```jsx
<Viewer
  // ... (iModel related information)
  authClient={myTokenServerAuthClient}
>
```

If a custom port is defined in setting up the token server, provide the new port using `TOKEN_URL`. The default value is, `http://localhost:3001/getToken`.
