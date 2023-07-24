/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { useIsMountedRef } from "@itwin/mobile-ui-react";
import { DownloadBriefcaseOptions, DownloadProgressInfo, NativeApp } from "@itwin/core-frontend";
import { MinimalIModel } from "@itwin/imodels-client-management";
import { BentleyError, BriefcaseDownloader, BriefcaseStatus, IModelStatus, LocalBriefcaseProps, SyncMode } from "@itwin/core-common";
import { ProgressRadial } from "@itwin/itwinui-react";
import { Button, IModelInfo, presentError, useLocalizedString } from "../../Exports";

/**
 * Download the given iModel, reporting progress via {@link handleProgress}.
 * @param project The iModel's project.
 * @param iModel The iModel to download.
 * @param handleProgress Progress callback.
 * @returns The {@link LocalBriefcaseProps} for the downloaded iModel if successful, otherwise
 * undefined.
 */
async function downloadIModel(iTwinId: string, iModel: MinimalIModel, handleProgress: (progress: DownloadProgressInfo) => boolean): Promise<LocalBriefcaseProps | undefined> {
  const opts: DownloadBriefcaseOptions = {
    syncMode: SyncMode.PullOnly,
    progressCallback: async (progress: DownloadProgressInfo) => {
      if (!handleProgress(progress)) {
        await downloader?.requestCancel();
        canceled = true;
      }
    },
  };
  let downloader: BriefcaseDownloader | undefined;
  let canceled = false;
  try {
    downloader = await NativeApp.requestDownloadBriefcase(iTwinId, iModel.id, opts);

    if (canceled) {
      // If we got here we canceled before the initial return from NativeApp.requestDownloadBriefcase
      void downloader.requestCancel();
      return undefined;
    }

    // Wait for the download to complete.
    await downloader.downloadPromise;
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      // This should never happen, since we just downloaded it, but check, just in case.
      console.error("Error downloading iModel.");
    }
    return localBriefcases[0];
  } catch (error) {
    if (error instanceof BentleyError) {
      if (error.errorNumber === IModelStatus.FileAlreadyExists) {
        // When a download is canceled, the partial briefcase file does not get deleted, which causes
        // any subsequent download attempt to fail with this error number. If that happens, delete the
        // briefcase and try again.
        try {
          // When syncMode is SyncMode.PullOnly (which is what we use), briefcaseId is ALWAYS 0, so try
          // to delete the existing file using that briefcaseId.
          const filename = await NativeApp.getBriefcaseFileName({ iModelId: iModel.id, briefcaseId: 0 });
          await NativeApp.deleteBriefcase(filename);
          return downloadIModel(iTwinId, iModel, handleProgress);
        } catch (_error) { }
      } else if (error.errorNumber === BriefcaseStatus.DownloadCancelled && canceled) {
        // When we call requestCancel, it causes the downloader to throw this error; ignore.
        return undefined;
      }
    }
    // There was an error downloading the iModel. Show the error
    presentError("DownloadErrorFormat", error, "HubScreen");
  }
  return undefined;
}

/** Properties for the {@link IModelDownloader} React component. */
export interface IModelDownloaderProps {
  iTwinId: string;
  model: IModelInfo;
  onDownloaded: (model: IModelInfo) => void;
  onCanceled?: () => void;
}

/** React component that downloads an iModel and shows download progress. */
export function IModelDownloader(props: IModelDownloaderProps) {
  const { iTwinId, model, onDownloaded, onCanceled } = props;
  const [progress, setProgress] = React.useState(0);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [canceled, setCanceled] = React.useState(false);
  const isMountedRef = useIsMountedRef();
  const downloadingLabel = useLocalizedString("HubScreen", "Downloading");
  const cancelLabel = useLocalizedString("HubScreen", "Cancel");

  // Progress callback for iModel download.
  const handleProgress = React.useCallback((progressInfo: DownloadProgressInfo) => {
    if (isMountedRef.current) {
      const percent: number = progressInfo.total !== 0 ? Math.round(100.0 * progressInfo.loaded / progressInfo.total) : 0;
      setProgress(percent);
      setIndeterminate(progressInfo.total === 0);
    }
    return isMountedRef.current && !canceled;
  }, [canceled, isMountedRef]);

  // Starup effect to initiate the iModel download.
  React.useEffect(() => {
    // We only want to download once.
    if (downloading) return;

    const fetchIModel = async () => {
      const minimalIModel = model.minimalIModel;
      const briefcase = await downloadIModel(iTwinId, minimalIModel, handleProgress);
      if (!isMountedRef.current) return;
      onDownloaded({ minimalIModel, briefcase });
    };
    setDownloading(true);
    void fetchIModel();
  }, [downloading, handleProgress, isMountedRef, model.minimalIModel, onDownloaded, iTwinId]);

  return <div className="centered-list">
    <div>{downloadingLabel}</div>
    <div style={{ paddingBottom: 10 }}>{model.minimalIModel.displayName}</div>
    <ProgressRadial value={progress} indeterminate={indeterminate}>{indeterminate ? "" : progress.toString()}</ProgressRadial>
    <Button title={cancelLabel} onClick={() => {
      setCanceled(true);
      onCanceled?.();
    }} />
  </div>;
}
