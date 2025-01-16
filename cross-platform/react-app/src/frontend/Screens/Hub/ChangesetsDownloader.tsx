/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IModelInfo } from "./IModelPicker";
import { BriefcaseConnection, DownloadProgressInfo } from "@itwin/core-frontend";
import { useIsMountedRef } from "@itwin/mobile-ui-react";
import { ProgressRadial } from "@itwin/itwinui-react";
import { Button, presentError, useLocalizedString } from "../../Exports";
import { BentleyError, ChangeSetStatus } from "@itwin/core-common";

/** Properties for the {@link ChangesetsDownloader} React component. */
export interface ChangesetDownloaderProps {
  model: IModelInfo;
  onDownloaded: (briefcasePromise: Promise<BriefcaseConnection>) => void;
  onCanceled: () => void;
}

/** React component that downloads the changesets for an iModel and shows download progress. */
export function ChangesetsDownloader(props: ChangesetDownloaderProps) {
  const { model, onDownloaded, onCanceled } = props;
  const [progress, setProgress] = React.useState(0);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [applying, setApplying] = React.useState(false);
  const downloadingRef = React.useRef(false);
  const isMountedRef = useIsMountedRef();
  const downloadingLabel = useLocalizedString("ChangesetsDownloader", "DownloadingChangesets");
  const applyingLabel = useLocalizedString("ChangesetsDownloader", "ApplyingChangesets");
  const cancelLabel = useLocalizedString("HubScreen", "Cancel");
  const abortController = React.useMemo(() => new AbortController(), []);

  // Progress callback for changeset download.
  const handleProgress = React.useCallback((progressInfo: DownloadProgressInfo) => {
    if (isMountedRef.current) {
      const percent: number = progressInfo.total !== 0 ? Math.round(100.0 * progressInfo.loaded / progressInfo.total) : 0;
      setProgress(percent);
      setIndeterminate(progressInfo.total === 0 || percent === 100);
      if (progressInfo.loaded === progressInfo.total) {
        setApplying(true);
      }
    }
    // NOTE: the isMountedRef returned by useIsMountedRef does not ever change, even though eslint
    // thinks it might. Also, since this callback called from the pullChanges callback, if it
    // ever changed then it would NOT work, since there is no way to update the progress callback
    // on an active download, and the callback we pass has its original value for handleProgress.
    // So, even though putting isMountedRef in the dependency array would produce the same behavior,
    // it is intentionally omitted to make it clear that this callback never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Startup effect to initiate the changeset download.
  React.useEffect(() => {
    // We only want to download once.
    if (downloadingRef.current) return;

    const fetchChangesets = async () => {
      if (!model.briefcase) {
        throw new Error("model is missing a briefcase value");
      }
      const briefcase = await BriefcaseConnection.openFile(model.briefcase);
      try {
        await briefcase.pullChanges(undefined, {
          downloadProgressCallback: (progressInfo) => {
            if (!isMountedRef.current) {
              abortController.abort();
              return;
            }
            handleProgress(progressInfo);
          },
          abortSignal: abortController.signal,
        });
        // There appears to be a bug in iTwin so that on at least some iModels, if we don't close
        // and reopen the briefcase, the viewport shows up as empty if the initial download was for
        // the iModel without any changesets.
        await briefcase.close();
        onDownloaded(BriefcaseConnection.openFile(model.briefcase));
      } catch (error) {
        // When we abort the changesets download, it causes a DownloadCancelled error; don't show
        // this error to the user.
        const isAbortError = error instanceof BentleyError && error.errorNumber === ChangeSetStatus.DownloadCancelled;
        if (!isAbortError) {
          // If the error is not due to the download being canceled, show the error message.
          await presentError("PullChangesErrorFormat", error, "ChangesetsDownloader");
        }
        await briefcase.close();
        onCanceled();
      }
    };
    downloadingRef.current = true;
    void fetchChangesets();
  }, [handleProgress, isMountedRef, model, onDownloaded, onCanceled, abortController]);

  let cancelButton: React.ReactNode | null = null;
  if (!applying) {
    // While we can cancel the changesets download, we cannot cancel the changesets application.
    cancelButton = <Button title={cancelLabel} onClick={async () => {
      abortController.abort();
    }} />;
  }
  return <div className="centered-list">
    <div>{applying ? applyingLabel : downloadingLabel}</div>
    <div style={{ paddingBottom: 10 }}>{model.minimalIModel.displayName}</div>
    <ProgressRadial value={progress} indeterminate={indeterminate}>{indeterminate ? "" : progress.toString()}</ProgressRadial>
    {cancelButton}
  </div>;
}
