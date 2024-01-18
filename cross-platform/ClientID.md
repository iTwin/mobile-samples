# Client ID Setup

1. If you have not already done so, [create a Bentley Account](./BentleyAccount.md).
1. Go to <https://developer.bentley.com/my-apps/>.
1. Click the "Register New" button.
1. Pick a name.
1. Select "Visualization", "Users", "iModels", and "iTwins" under "API Associations".
1. Under "Manage scopes", select the following to disable them:
    * itwins:modify
    * imodels:modify
1. Finish with the steps below from _either_ the __OIDC application__ section _or_ the __Service application__ section.

## OIDC application

Continuing from __Client ID Setup__ above, follow these steps if you are creating an application that uses a Bentley OIDC connection to communicate with the iModel Hub.

1. Select "Desktop/Mobile" as the application type.
1. Enter `imodeljs://app/signin-callback` for "Redirect URIs".
1. Enter `imodeljs://app/signout-callback` for "Post logout redirect URIs".
1. Save.
1. Select your newly generated app. You will see that it has a Client ID and Scopes.

## Service application

Continuing from __Client ID Setup__ above, follow these steps if you are creating an application that uses a third party auth provider via a token server to communicate with the iModel Hub.

1. Select "Service" as the application type.
1. Save.
1. Copy the __Client Secret__ from the box that pops up and store that somewhere locally that is secure.
    > __Note:__ You will see a warning that there is no way to get the secret again, due to it not being stored. This is accurate, but if you do lose your secret, you can generate a new one on your application's page.
1. Dismiss the box.
1. Your app page will show, which includes your Client ID and Scopes.

__Note:__ In order for your new service to have access to an iTwin, it must be invited. That works via a special email address that is generated for each service: `<Client ID>@apps.imsoidc.bentley.com`. Make sure to invite this email address to your iTwin.