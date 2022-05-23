# Offline iModels

You can load and view iModels while offline in two ways. The first is to simply open a snapshot iModel that the user has on the device. The second is to open a briefcase iModel that has previously been downloaded from the iModel Hub. [LocalModelsScreen.tsx](./cross-platform/react-app/src/frontend/Screens/LocalModelsScreen.tsx) uses the mechanisms described below for both snapshot iModels and downoaded briefcase iModels.

&nbsp;

## Snapshot iModels

To open a snapshot iModel, simply do the following:

```ts
import { SnapshotConnection } from "@itwin/core-frontend";

...

const snapshotConnection = await SnapshotConnection.openFile(modelPath);
```

The value in `modelPath` is the full path to a .bim file containing a snapshot iModel.

&nbsp;

## Downloaded briefcases

When an iModel is downloaded from the iModel Hub, it is a briefcase iModel. Attempting to open this using `SnapshotConnection` will fail, since it isn't a snapshot. So, you must instead use `BriefcaseConnection`:

```ts
import { BriefcaseConnection } from "@itwin/core-frontend";

...

const briefcaseConnection = await BriefcaseConnection.openFile(localBriefcase);
```

The value in `localBriefcase` is of type `LocalBriefcaseProps`. You can get a list of all downloaded briefcases like this:

```ts
const localBriefcases = await NativeApp.getCachedBriefcases();
```

Each entry in the returned array is of type `LocalBriefcaseProps`. Note that if you want the `LocalBriefcaseProps` for a specific iModel, you can pass the iModel's ID into `getCachedBriefcases`. That can in theory still return multiple values (for different applied change sets), but the mobile API always replaces the first briefcase when new change sets are downloaded, so if you pass an iModel ID, you will either get exactly one result (if the iModel has been downloaded), or zero (if the iModel hasn't been downloaded).

`LocalBriefcaseProps` does not contain the name of the iModel. So if you want to display that to the user, you either have to store a lookup table locally to go from iModel ID to name, or you have to open the downloaded briefcase and query for its name. The sample uses a lookup table stored in `localState`.