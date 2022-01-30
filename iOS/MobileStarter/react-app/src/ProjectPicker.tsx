/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { HorizontalPicker, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project, ProjectsAccessClient, ProjectsQueryArg, ProjectsQueryFunction, ProjectsSearchableProperty, ProjectsSource } from "@itwin/projects-client";
import { ProgressCallback } from "@itwin/core-frontend/lib/cjs/request/Request";
import { IModelApp } from "@itwin/core-frontend";
import { LoadingSpinner } from "@itwin/core-react";
import { SearchControl, i18n, presentError, ButtonProps, HubScreenButton, HubScreenButtonListProps, HubScreenButtonList } from "./Exports";

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

export interface ProjectPickerProps {
  signedIn: boolean;
  onSelect?: (project: Project) => void;
  onError?: (error: any) => void;
}

export function ProjectPicker(props: ProjectPickerProps) {
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
