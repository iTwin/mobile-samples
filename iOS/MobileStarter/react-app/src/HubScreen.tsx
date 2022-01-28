/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { AlertAction, ITMAuthorizationClient, MobileCore } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, BackButton, HorizontalPicker, IconImage, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project, ProjectsAccessClient, ProjectsQueryArg, ProjectsQueryFunction, ProjectsSearchableProperty, ProjectsSource } from "@itwin/projects-client";
import { ProgressCallback, ProgressInfo } from "@bentley/itwin-client";
import { BriefcaseConnection, DownloadBriefcaseOptions, IModelApp, IModelConnection, NativeApp } from "@itwin/core-frontend";
import { IModelsClient, MinimalIModel } from "@itwin/imodels-client-management";
import { AccessTokenAdapter } from "@itwin/imodels-access-frontend";
import { BentleyError, BriefcaseDownloader, BriefcaseStatus, IModelStatus, LocalBriefcaseProps, SyncMode } from "@itwin/core-common";
import { LoadingSpinner } from "@itwin/core-react";
import { ProgressRadial } from "@itwin/itwinui-react";
import { Button, fileSizeString, SearchControl, i18n, presentError, Screen, ButtonProps } from "./Exports";
import "./HubScreen.scss";

// Get all the projects that this user has access to, sorted by most recent use.
async function getProjects(progress?: ProgressCallback, source = ProjectsSource.All, searchString = "") {
  const client = new ProjectsAccessClient();
  const chunkSize = 100;
  const allProjects: Project[] = [];
  const accessToken = await IModelApp.getAccessToken();

  try {
    let queryArgs: ProjectsQueryArg = { pagination: { skip: 0, top: chunkSize } };
    if (source === ProjectsSource.All && searchString.length > 0)
      queryArgs.search = { searchString, propertyName: ProjectsSearchableProperty.Name, exactMatch: false };
    else
      queryArgs.source = source;
    const chunk = await client.getByQuery(accessToken, queryArgs);
    allProjects.push(...chunk.projects);
    progress?.({ loaded: allProjects.length });
    return { projects: allProjects, next: chunk.links?.next };
  } catch (ex) {
    console.log(`Exception fetching projects: ${ex}`);
    if (allProjects.length > 0) {
      return { projects: allProjects, next: undefined };
    } else {
      throw ex;
    }
  }
}

HubScreen.ACTIVE_PROJECT_INFO = "activeProjectInfo";

function getActiveProject() {
  const projectInfoJson = localStorage.getItem(HubScreen.ACTIVE_PROJECT_INFO);
  if (projectInfoJson) {
    let project = JSON.parse(projectInfoJson);
    if (project.id) {
      // The format of the project object changed in iTwin 3. Since the id field is required, return
      // undefined if our stored project does not have a value for that field.
      return project as Project;
    } else {
      return undefined;
    }
  }
  return undefined;
}

function saveActiveProject(project: Project) {
  localStorage.setItem(HubScreen.ACTIVE_PROJECT_INFO, JSON.stringify(project));
}

interface IModelInfo {
  minimalIModel: MinimalIModel;
  briefcase?: LocalBriefcaseProps;
}

function HubScreenButton(props: ButtonProps) {
  const { className, ...others } = props;
  return <Button className={classnames("imodel-row", className)} {...others} />;
}

interface HubScreenButtonListProps {
  children?: React.ReactNode;
  loading?: boolean;
}

function HubScreenButtonList(props: HubScreenButtonListProps) {
  const { children, loading } = props;
  if (loading)
    return <div className="centered"><LoadingSpinner /></div>;

  return <div className="list">
    <div className="list-items">{children}</div>
  </div>;
}

interface IModelButtonProps extends Omit<ButtonProps, "title"> {
  modelInfo: IModelInfo;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
};

function IModelButton(props: IModelButtonProps) {
  const { modelInfo, onClick, onCacheDeleted } = props;
  const { minimalIModel, briefcase } = modelInfo;
  const isMountedRef = useIsMountedRef();

  const getTitle = (title: string, briefcase: LocalBriefcaseProps | undefined) => {
    if (!briefcase) return title;
    return title + " (" + fileSizeString(briefcase.fileSize) + ")";
  }

  return <HubScreenButton
    title={getTitle(minimalIModel.displayName, briefcase)}
    onClick={onClick}
  >
    {briefcase && <div className="delete-button" onClick={async (e) => {
      e.stopPropagation();
      try {
        await MobileCore.deleteCachedBriefcase(briefcase);
        if (!isMountedRef.current) return;
        onCacheDeleted?.(modelInfo);
      } catch (error) {
        // There was a problem deleting the cached briefcase. Show the error.
        presentError("DeleteErrorFormat", error, "HubScreen");
      }
    }}>
      <IconImage iconSpec="icon-delete" />
    </div>}
  </HubScreenButton>
}

interface IModelListProps extends HubScreenButtonListProps {
  models: IModelInfo[];
  onClick?: (model: IModelInfo) => void;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
}

function IModelList(props: IModelListProps) {
  const { models, loading, onClick, onCacheDeleted, children } = props;
  return <HubScreenButtonList loading={loading}>
    {models.map((model, index) => <IModelButton key={index} modelInfo={model} onClick={() => onClick?.(model)} onCacheDeleted={onCacheDeleted} />)}
    {children}
  </HubScreenButtonList>;
}

async function getIModels(project: Project) {
  const imodelsClient = new IModelsClient();
  const accessToken = await IModelApp.getAccessToken();
  const minimalIModels: MinimalIModel[] = [];
  // Fetch the list of iModels.
  for await (const minimalIModel of imodelsClient.iModels.getMinimalList({
    authorization: AccessTokenAdapter.toAuthorizationCallback(accessToken),
    urlParams: {
      projectId: project.id,
    }
  })) {
    minimalIModels.push(minimalIModel);
  }
  // Sort them by name using case-insensitive sort.
  minimalIModels.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  const iModelInfos: IModelInfo[] = [];
  for (const minimalIModel of minimalIModels) {
    const localBriefcases = await NativeApp.getCachedBriefcases(minimalIModel.id);
    const briefcase = localBriefcases.length > 0 ? localBriefcases[0] : undefined;
    iModelInfos.push({ minimalIModel, briefcase });
  }
  return iModelInfos;
}

async function downloadIModel(project: Project, iModel: MinimalIModel, handleProgress: (progress: ProgressInfo) => boolean): Promise<IModelInfo> {
  const opts: DownloadBriefcaseOptions = { syncMode: SyncMode.PullOnly };
  let downloader: BriefcaseDownloader | undefined;
  let canceled = false;
  try {
    downloader = await NativeApp.requestDownloadBriefcase(project.id, iModel.id, opts, undefined, (progress: ProgressInfo) => {
      if (!handleProgress(progress)) {
        console.log("Canceling download.");
        downloader?.requestCancel();
        canceled = true;
      }
    });

    if (canceled) {
      // If we got here we canceled before the initial return from NativeApp.requestDownloadBriefcase
      downloader.requestCancel();
      return { minimalIModel: iModel };
    }

    // Wait for the download to complete.
    console.log(`Downloading name:${iModel.displayName} id:${iModel.id}`);
    await downloader.downloadPromise;
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      // This should never happen, since we just downloaded it, but check, just in case.
      console.error("Error downloading iModel.");
    }
    return { minimalIModel: iModel, briefcase: localBriefcases[0] };
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
        return { minimalIModel: iModel };
      }
    }
    // There was an error downloading the iModel. Show the error
    presentError("DownloadErrorFormat", error, "HubScreen");
  }
  return { minimalIModel: iModel };
}

interface IModelDownloaderProps {
  project: Project;
  model: IModelInfo;
  onDownloaded: (model: IModelInfo) => void;
  onCanceled?: () => void;
}

function IModelDownloader(props: IModelDownloaderProps) {
  const { project, model, onDownloaded, onCanceled } = props;
  const [progress, setProgress] = React.useState(0);
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [canceled, setCanceled] = React.useState(false);
  const isMountedRef = useIsMountedRef();
  const downloadingLabel = React.useMemo(() => i18n("HubScreen", "Downloading"), []);
  const cancelLabel = React.useMemo(() => i18n("HubScreen", "Cancel"), []);

  const handleProgress = React.useCallback((progressInfo: ProgressInfo) => {
    if (isMountedRef.current) {
      const percent: number = progressInfo.percent ?? (progressInfo.total ? Math.round(100.0 * progressInfo.loaded / progressInfo.total) : 0);
      setProgress(percent);
      setIndeterminate(false);
    }
    return isMountedRef.current && !canceled;
  }, [canceled, isMountedRef]);

  React.useEffect(() => {
    if (downloading)
      return;

    const fetchIModel = async () => {
      const newModel = await downloadIModel(project, model.minimalIModel, handleProgress);
      if (!isMountedRef.current) return;
      onDownloaded(newModel);
    };
    setDownloading(true);
    fetchIModel();
  }, [downloading, handleProgress, isMountedRef, model.minimalIModel, onDownloaded, project]);

  return <div className="centered">
    <div>{downloadingLabel}</div>
    <div style={{ paddingBottom: 10 }}>{model.minimalIModel.displayName}</div>
    <ProgressRadial value={progress} indeterminate={indeterminate}>{indeterminate ? "" : progress.toString()}</ProgressRadial>
    <Button title={cancelLabel} onClick={() => {
      setCanceled(true);
      onCanceled?.();
    }} />
  </div>;
}

interface IModelPickerProps {
  project: Project | undefined;
  signedIn: boolean;
  onSelect?: (model: IModelInfo) => void;
  onLoaded?: (models: IModelInfo[]) => void;
  onError?: (error: any) => void;
}

function IModelPicker(props: IModelPickerProps) {
  const { project, signedIn, onSelect, onLoaded, onError } = props;
  const [iModels, setIModels] = React.useState<IModelInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const isMountedRef = useIsMountedRef();

  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    if (!project || !signedIn) {
      setIModels([]);
      setLoading(false);
      return;
    }

    const fetchModels = async () => {
      try {
        setLoading(true);
        const models = await getIModels(project);
        if (!isMountedRef.current)
          return;
        setIModels(models);
        onLoaded?.(models);
      } catch (error) {
        setIModels([]);
        presentError("GetIModelsErrorFormat", error, "HubScreen");
        onError?.(error);
      }
      setLoading(false);
    };
    fetchModels();
  }, [isMountedRef, onError, onLoaded, project, signedIn]);

  return <IModelList models={iModels} loading={loading} onClick={onSelect} onCacheDeleted={(model) => {
    model.briefcase = undefined;
    setIModels([...iModels]);
  }} />;
}

interface ProjectButtonProps extends Omit<ButtonProps, "title"> {
  project: Project;
}

function ProjectButton(props: ProjectButtonProps) {
  const { project, onClick } = props;
  return <HubScreenButton
    title={project.name ?? ""}
    onClick={onClick}
  />;
}

interface ProjectListProps extends HubScreenButtonListProps {
  projects: Project[];
  onClick?: (project: Project) => void;
}

function ProjectList(props: ProjectListProps) {
  const { projects, loading, onClick, children } = props;
  return <HubScreenButtonList loading={loading}>
    {projects.map((project, index) => <ProjectButton key={index} project={project} onClick={() => onClick?.(project)} />)}
    {children}
  </HubScreenButtonList>;
}

interface ProjectPickerProps {
  signedIn: boolean;
  onSelect?: (project: Project) => void;
  onError?: (error: any) => void;
}

function ProjectPicker(props: ProjectPickerProps) {
  const { signedIn, onSelect, onError } = props;
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [search, setSearch] = React.useState("");
  const [projectSource, setProjectSource] = React.useState(ProjectsSource.Recents);
  const [loading, setLoading] = React.useState(false);
  const [nextFunc, setNextFunc] = React.useState<ProjectsQueryFunction>();
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadMoreLabel = React.useMemo(() => i18n("HubScreen", "LoadMore"), []);
  const isMountedRef = useIsMountedRef();
  const searchLabel = React.useMemo(() => i18n("HubScreen", "Search"), []);
  const projectSources = React.useMemo(() => [ProjectsSource.All, ProjectsSource.Recents, ProjectsSource.Favorites], []);
  const projectSourceLabels = React.useMemo(() => [i18n("HubScreen", "All"), i18n("HubScreen", "Recents"), i18n("HubScreen", "Favorites")], []);

  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    if (!signedIn) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const { projects: fetchedProjects, next } = await getProjects(undefined, projectSource, search);
        if (!isMountedRef.current)
          return;
        setProjects(fetchedProjects);
        setNextFunc(() => projectSource === ProjectsSource.All ? next : undefined);
      } catch (error) {
        setProjects([]);
        presentError("FetchProjectsErrorFormat", error, "HubScreen");
        onError?.(error);
      }
      setLoading(false);
    };
    fetchProjects();
  }, [isMountedRef, onError, projectSource, search, signedIn]);

  return <>
    <div className="project-source">
      <HorizontalPicker
        items={projectSourceLabels}
        selectedIndex={projectSources.findIndex(key => key === projectSource)}
        onItemSelected={index => setProjectSource(projectSources[index])} />
      {projectSource === ProjectsSource.All && <SearchControl placeholder={searchLabel} onSearch={searchVal => setSearch(searchVal)} initialValue={search} />}
    </div>
    <ProjectList projects={projects} onClick={onSelect} loading={loading}>
      {loadingMore && <LoadingSpinner />}
      {nextFunc && !loadingMore && <HubScreenButton title={loadMoreLabel} style={{ ["--color" as any]: "var(--muic-active)" }} onClick={async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        const accessToken = await IModelApp.getAccessToken();
        if (!isMountedRef.current) return;
        try {
          const moreProjects = await nextFunc(accessToken);
          if (!isMountedRef.current) return;
          if (moreProjects.projects.length) {
            setProjects((oldProjects) => [...oldProjects, ...moreProjects.projects]);
            setNextFunc(projectSource === ProjectsSource.All && moreProjects.links.next ? () => moreProjects.links.next : undefined);
          }
        } catch (error) {
          presentError("FetchProjectsErrorFormat", error, "HubScreen");
          onError?.(error);
        }
        setLoadingMore(false);
      }} />}
    </ProjectList>
  </>;
}

/// Properties for the [[HubScreen]] React component.
export interface HubScreenProps {
  /// Callback called when an iModel is opened.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called when the back button is pressed to go to the previous screen.
  onBack: () => void;
}

enum HubStep {
  SignIn,
  SelectProject,
  SelectIModel,
  DownloadIModel,
  Error
}

/// React component to allow downloading and opening models from the iModel Hub.
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack } = props;
  const [initialized, setInitialized] = React.useState(false);
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [project, setProject] = React.useState(getActiveProject());
  const [haveCachedBriefcase, setHaveCachedBriefcase] = React.useState(false);
  const [iModel, setIModel] = React.useState<IModelInfo>();
  // Any time we do anything asynchronous, we have to check if the component is still mounted,
  // or it can lead to a run-time exception.
  const isMountedRef = useIsMountedRef();
  const titleLabels = React.useMemo(() => [
    i18n("HubScreen", "Connecting"),
    i18n("HubScreen", "SelectProject"),
    i18n("Shared", "SelectIModel"),
    i18n("HubScreen", "DownloadingIModel"),
  ], []);
  const signOutLabel = React.useMemo(() => i18n("HubScreen", "SignOut"), []);
  const deleteAllDownloadsLabel = React.useMemo(() => i18n("HubScreen", "DeleteAllDownloads"), []);
  const changeProjectLabel = React.useMemo(() => i18n("HubScreen", "ChangeProject"), []);

  // Effect that makes sure we are signed in, then continues to whatever comes next.
  React.useEffect(() => {
    // Figure out what to do after we are signed in, then do it.
    const afterSignedIn = () => {
      if (project === undefined) {
        // If we don't have an active project, let user select one.
        setHubStep(HubStep.SelectProject);
      } else {
        // Let the user select an iModel.
        setHubStep(HubStep.SelectIModel);
      }
    }
    // Sign in.
    const signin = async () => {
      try {
        const startTicks = performance.now();
        console.log("About to sign in.");
        // @Todo sign in handling.
        // await IModelApp.authorizationClient?.signIn();
        await IModelApp.authorizationClient?.getAccessToken();
        if (!isMountedRef.current) return;
        const elapsed = performance.now() - startTicks;
        console.log("Signin took " + (elapsed / 1000) + " seconds.");
        // Do whatever comes next.
        afterSignedIn();
      } catch (error) {
        // There was a problem signing in. Show the error, and give the user the option
        // to sign out.
        presentError("SigninErrorFormat", error, "HubScreen");
        setHubStep(HubStep.Error);
      }
    }
    // We only want to do this once, and since the effect gets called when various things
    // change, use the initialized state variable to track whether or not we have executed.
    if (!initialized) {
      // Set the initialized state variable to true to prevent us from redoing this.
      setInitialized(true);
      // @Todo sign in handling.
      // if (IModelApp.authorizationClient?.hasSignedIn) {
      //   // We're already signed in, so do whatever comes next.
      //   afterSignedIn();
      // } else {
      // Sign in, then do whatever comes next.
      signin();
      // }
    }
  }, [isMountedRef, project, initialized]);

  let moreButton: React.ReactNode;
  let stepContent: React.ReactNode;

  switch (hubStep) {
    case HubStep.SelectProject:
      stepContent = <ProjectPicker signedIn={initialized}
        onSelect={(newProject) => {
          saveActiveProject(newProject);
          setProject(newProject);
          setHubStep(HubStep.SelectIModel);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectIModel:
      const actions: AlertAction[] = [];
      if (haveCachedBriefcase) {
        actions.push({
          name: "deleteAll",
          title: deleteAllDownloadsLabel,
          onSelected: async () => {
            if (project) {
              try {
                await MobileCore.deleteCachedBriefcases(project.id);
                if (!isMountedRef.current) return;
                setHaveCachedBriefcase(false);
              } catch (error) {
                // There was a problem deleting the cached briefcases. Show the error, then refresh
                // anyway so if any were successfully deleted, it will reflect that.
                presentError("DeleteAllErrorFormat", error, "HubScreen");
                setProject({ ...project });
              }
            }
          }
        });
      }
      if (project) {
        actions.push({
          name: "changeProject",
          title: changeProjectLabel,
          onSelected: () => setHubStep(HubStep.SelectProject),
        })
      }
      if (actions.length > 0) {
        moreButton = <ActionSheetButton actions={actions} showStatusBar />;
      }
      stepContent = <IModelPicker signedIn={initialized} project={project}
        onLoaded={(models) => setHaveCachedBriefcase(models.some(model => model.briefcase !== undefined))}
        onSelect={(model) => {
          setIModel(model);
          if (model.briefcase)
            onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          else
            setHubStep(HubStep.DownloadIModel);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.DownloadIModel:
      if (project && iModel) {
        stepContent = <IModelDownloader
          project={project}
          model={iModel}
          onDownloaded={(model) => {
            setIModel(model);
            if (model.briefcase)
              onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          }}
          onCanceled={() => setHubStep(HubStep.SelectIModel)}
        />;
      }
      break;

    case HubStep.Error:
      stepContent = <div className="centered">
        <Button title={signOutLabel} onClick={async () => {
          if (IModelApp.authorizationClient instanceof ITMAuthorizationClient) {
            try {
              await IModelApp.authorizationClient.signOut();
            } catch (error) {
              console.log(`Error signing out: ${error}`);
            }
          }
          onBack();
        }} />
      </div>
      break;
  }

  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <BackButton onClick={() => hubStep === HubStep.DownloadIModel ? setHubStep(HubStep.SelectIModel) : onBack()} />
          <div className="title-text">{titleLabels[hubStep]}</div>
          <div className="right-tools-parent">{moreButton}</div>
        </div>
        {stepContent}
      </div>
    </Screen >
  );
}
