/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { HorizontalPicker, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project, ProjectsAccessClient, ProjectsQueryArg, ProjectsQueryFunction, ProjectsSearchableProperty, ProjectsSource } from "@itwin/projects-client";
import { IModelApp } from "@itwin/core-frontend";
import { LoadingSpinner } from "@itwin/core-react";
import { ButtonProps, HubScreenButton, HubScreenButtonList, HubScreenButtonListProps, i18n, presentError, SearchControl } from "../../Exports";

async function getProjects(source = ProjectsSource.All, searchString = "") {
  const client = new ProjectsAccessClient();
  const numToFetch = 100;
  const accessToken = await IModelApp.getAccessToken();

  const queryArgs: ProjectsQueryArg = { pagination: { skip: 0, top: numToFetch } };
  if (source === ProjectsSource.All && searchString.length > 0)
    queryArgs.search = { searchString, propertyName: ProjectsSearchableProperty.Name, exactMatch: false };
  else
    queryArgs.source = source;
  const results = await client.getByQuery(accessToken, queryArgs);
  return { projects: results.projects, next: results.links?.next };
}

interface ProjectButtonProps extends Omit<ButtonProps, "title"> {
  project: Project;
}

function ProjectButton(props: ProjectButtonProps) {
  const { project, onClick } = props;
  const noNameLabel = React.useMemo(() => i18n("HubScreen", "NoName"), []);
  return <HubScreenButton title={project.name ?? noNameLabel} onClick={onClick} />;
}

interface ProjectListProps extends HubScreenButtonListProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

function ProjectList(props: ProjectListProps) {
  const { projects, onSelect, children, ...others } = props;
  return <HubScreenButtonList {...others}>
    {projects.map((project, index) => <ProjectButton key={index} project={project} onClick={() => onSelect?.(project)} />)}
    {children}
  </HubScreenButtonList>;
}

export interface ProjectPickerProps {
  onSelect?: (project: Project) => void;
  onError?: (error: any) => void;
}

export function ProjectPicker(props: ProjectPickerProps) {
  const { onSelect, onError } = props;
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
  const fetchId = React.useRef(0);

  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const currFetchId = ++fetchId.current;
        const { projects: fetchedProjects, next } = await getProjects(projectSource, search);
        // If the component is no longer mounted or another fetch has occurred, just return.
        if (!isMountedRef.current || fetchId.current !== currFetchId)
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
    fetchProjects(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [isMountedRef, onError, projectSource, search]);

  const loadMore = React.useCallback(async () => {
    if (loadingMore || !nextFunc) return;
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
  }, [isMountedRef, loadingMore, nextFunc, onError, projectSource]);

  const onScroll = React.useCallback((element: HTMLElement) => {
    const atBottom = element.scrollTop > 0 && element.scrollHeight - element.scrollTop <= element.clientHeight;
    if (atBottom) {
      loadMore(); // eslint-disable-line @typescript-eslint/no-floating-promises
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
