/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { HorizontalPicker, useIsMountedRef } from "@itwin/mobile-ui-react";
import { ITwin, ITwinsAccessClient, ITwinsAPIResponse, ITwinsQueryArg, ITwinSubClass } from "@itwin/itwins-client";
import { IModelApp } from "@itwin/core-frontend";
import { LoadingSpinner } from "@itwin/core-react";
import { ButtonProps, HubScreenButton, HubScreenButtonList, HubScreenButtonListProps, i18n, presentError, PromiseUtil, SearchControl, useLocalizedString } from "../../Exports";

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Project = WithRequired<ITwin, "id">;

enum ProjectsSource {
  All = "",
  Favorites = "favorites",
  Recents = "recents"
}

interface ProjectsQueryResponse {
  projects: Array<Project>;
  next: ProjectsQueryFunction | undefined;
}
type ProjectsQueryFunction = () => Promise<ProjectsQueryResponse>;

/**
 * Get a list of iTwin Projects from the Bentley server.
 * @param source The source of the list: All, Favorites, or Recents
 * @param search A search string
 * @param skip Number of results to skip
 * @returns An object whose `projects` property is the list of iTwins, and whose `next` property
 * is an arrow function to fetch the next batch.
 */
async function getProjects(source: ProjectsSource, search = "", skip = 0): Promise<ProjectsQueryResponse> {
  const client = new ITwinsAccessClient();
  const numToFetch = 100;
  const accessToken = await IModelApp.getAccessToken();
  const queryArgs: ITwinsQueryArg = { skip, top: numToFetch };
  let results: ITwinsAPIResponse<ITwin[]> | undefined;

  switch (source) {
    case ProjectsSource.All:
      results = await client.queryAsync(accessToken, ITwinSubClass.Project, { ...queryArgs, search });
      break;
    case ProjectsSource.Favorites:
      results = await client.queryFavoritesAsync(accessToken, ITwinSubClass.Project, queryArgs);
      break;
    case ProjectsSource.Recents:
      results = await client.queryRecentsAsync(accessToken, ITwinSubClass.Project, queryArgs);
      break;
  }
  // Provide a next function if we received a full page of data
  let next: ProjectsQueryFunction | undefined;
  if (results.data?.length === numToFetch) {
    next = async () => getProjects(source, search, skip + numToFetch);
  }
  // NOTE: Assume all returned ITwins have a valid id, should be safe since they're queried from the server.
  return { projects: results.data as Array<Project> ?? [], next };
}

/** Properties for the {@link ProjectButton} React component. */
interface ProjectButtonProps extends Omit<ButtonProps, "title"> {
  project: ITwin;
}

/** React component to show a button to select a project. */
function ProjectButton(props: ProjectButtonProps) {
  const { project, onClick } = props;
  const noNameLabel = useLocalizedString("HubScreen", "NoName");
  return <HubScreenButton title={project.displayName ?? noNameLabel} onClick={onClick} />;
}

/** Properties for the {@link ProjectList} React component. */
interface ProjectListProps extends HubScreenButtonListProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

/** React component to show a list of projects. */
function ProjectList(props: ProjectListProps) {
  const { projects, onSelect, children, ...others } = props;
  return <HubScreenButtonList {...others}>
    {projects.map((project, index) => <ProjectButton key={index} project={project} onClick={() => onSelect?.(project)} />)}
    {children}
  </HubScreenButtonList>;
}

/** Properties for the {@link ProjectPicker} React component. */
export interface ProjectPickerProps {
  onSelect?: (project: Project) => void;
  onError?: (error: any) => void;
}

/**
 * React component to show the user the projects they have access to so they can pick one.
 */
export function ProjectPicker(props: ProjectPickerProps) {
  const { onSelect, onError } = props;
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [search, setSearch] = React.useState("");
  const [projectSource, setProjectSource] = React.useState(ProjectsSource.Recents);
  const [loading, setLoading] = React.useState(false);
  const [nextFunc, setNextFunc] = React.useState<ProjectsQueryFunction>();
  const [loadingMore, setLoadingMore] = React.useState(false);
  const loadMoreLabel = useLocalizedString("HubScreen", "LoadMore");
  const isMountedRef = useIsMountedRef();
  const searchLabel = useLocalizedString("HubScreen", "Search");
  const projectSources = React.useMemo(() => [ProjectsSource.All, ProjectsSource.Recents, ProjectsSource.Favorites], []);
  const projectSourceLabels = React.useMemo(() => [i18n("HubScreen", "All"), i18n("HubScreen", "Recents"), i18n("HubScreen", "Favorites")], []);
  const fetchId = React.useRef(0);

  // Fetch the projects any time projectSource or search change.
  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const currFetchId = ++fetchId.current;
        const results = await getProjects(projectSource, search);
        // If the component is no longer mounted or another fetch has occurred, just return.
        if (!isMountedRef.current || fetchId.current !== currFetchId)
          return;
        setProjects(results.projects);
        setNextFunc(() => results.next);
      } catch (error) {
        setProjects([]);
        presentError("FetchProjectsErrorFormat", error, "HubScreen");
        onError?.(error);
      }
      setLoading(false);
    };
    void PromiseUtil.consolidateCall("fetchProjects", async () => fetchProjects());
  }, [isMountedRef, onError, projectSource, search]);

  // Loads the next batch of projects if `nextFunc` is defined.
  const loadMore = React.useCallback(async () => {
    if (loadingMore || !nextFunc) return;
    setLoadingMore(true);
    if (!isMountedRef.current) return;
    try {
      const moreProjects = await nextFunc();
      if (!isMountedRef.current) return;
      if (moreProjects.projects.length) {
        setProjects((oldProjects) => [...oldProjects, ...moreProjects.projects]);
        setNextFunc(moreProjects.next ? () => moreProjects.next : undefined);
      } else {
        setNextFunc(undefined);
      }
    } catch (error) {
      presentError("FetchProjectsErrorFormat", error, "HubScreen");
      onError?.(error);
    }
    setLoadingMore(false);
  }, [isMountedRef, loadingMore, nextFunc, onError]);

  // Automatically load more projects if needed when the user scrolls to the bottom of the list.
  const onScroll = React.useCallback((element: HTMLElement) => {
    const atBottom = element.scrollTop > 0 && element.scrollHeight - element.scrollTop <= element.clientHeight;
    if (atBottom) {
      void loadMore();
    }
  }, [loadMore]);

  return <>
    <div className="project-source">
      <HorizontalPicker
        items={projectSourceLabels}
        selectedIndex={projectSources.findIndex((key) => key === projectSource)}
        onItemSelected={(index) => setProjectSource(projectSources[index])} />
      {projectSource === ProjectsSource.All && <SearchControl placeholder={searchLabel} onSearch={(searchVal) => setSearch(searchVal)} initialValue={search} />}
    </div>
    <ProjectList projects={projects} onSelect={onSelect} onScroll={onScroll} loading={loading}>
      {loadingMore && <LoadingSpinner />}
      {nextFunc && !loadingMore && <HubScreenButton title={loadMoreLabel} style={{ ["--color" as any]: "var(--muic-active)" }} onClick={loadMore} />}
    </ProjectList>
  </>;
}
