/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project } from "@itwin/projects-client";
import { DownloadBriefcaseOptions, DownloadProgressInfo, NativeApp } from "@itwin/core-frontend";
import { MinimalIModel } from "@itwin/imodels-client-management";
import { BentleyError, BriefcaseDownloader, BriefcaseStatus, IModelStatus, LocalBriefcaseProps, SyncMode } from "@itwin/core-common";
import { ProgressRadial } from "@itwin/itwinui-react";
import { Button, i18n, IModelInfo, presentError } from "../../Exports";

async function downloadIModel(project: Project, iModel: MinimalIModel, handleProgress: (progress: DownloadProgressInfo) => boolean): Promise<LocalBriefcaseProps | undefined> {
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
    downloader = await NativeApp.requestDownloadBriefcase(project.id, iModel.id, opts);

    if (canceled) {
      // If we got here we canceled before the initial return from NativeApp.requestDownloadBriefcase
      downloader.requestCancel(); // eslint-disable-line @typescript-eslint/no-floating-promises
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
          return downloadIModel(project, iModel, handleProgress);
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

export interface IModelDownloaderProps {
  project: Project;
  model: IModelInfo;
  onDownloaded: (model: IModelInfo) => void;
  onCanceled?: () => void;
}

export function IModelDownloader(props: IModelDownloaderProps) {
  const { project, model, onDownloaded, onCanceled } = props;
  const [progress, setProgress] = React.useState(0);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [canceled, setCanceled] = React.useState(false);
  const isMountedRef = useIsMountedRef();
  const downloadingLabel = React.useMemo(() => i18n("HubScreen", "Downloading"), []);
  const cancelLabel = React.useMemo(() => i18n("HubScreen", "Cancel"), []);

  const handleProgress = React.useCallback((progressInfo: DownloadProgressInfo) => {
    if (isMountedRef.current) {
      const percent: number = progressInfo.total !== 0 ? Math.round(100.0 * progressInfo.loaded / progressInfo.total) : 0;
      setProgress(percent);
      setIndeterminate(progressInfo.total === 0);
    }
    return isMountedRef.current && !canceled;
  }, [canceled, isMountedRef]);

  React.useEffect(() => {
    if (downloading)
      return;

    const fetchIModel = async () => {
      const minimalIModel = model.minimalIModel;
      const briefcase = await downloadIModel(project, minimalIModel, handleProgress);
      if (!isMountedRef.current) return;
      onDownloaded({ minimalIModel, briefcase });
    };
    setDownloading(true);
    fetchIModel(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [downloading, handleProgress, isMountedRef, model.minimalIModel, onDownloaded, project]);

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
