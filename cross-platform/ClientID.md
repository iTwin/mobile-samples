# Client ID Setup

1. If you have not already done so, [create a Bentley Account](./BentleyAccount.md).
1. Go to <https://developer.bentley.com/my-apps/>.
1. Click the "Register New" button.
1. Pick a name.
1. Check the check boxes next to "Visualization", "Administration", and "Digital Twin Management".
1. Remove the following scopes by selecting the X next to them:
    * library:modify
    * realitydata:modify
    * library:read
    * imodels:modify
    * storage:modify
    * storage:read
    * projects:modify
    * users:read
1. Select "Desktop/Mobile" as the application type.
1. Enter `imodeljs://app/signin-callback` for "Redirect URIs".
1. Enter `imodeljs://app/signout-callback` for "Post logout redirect URIs".
1. Save.
1. Select your newly generated app. You will see that it has a Client ID, and Scopes.
