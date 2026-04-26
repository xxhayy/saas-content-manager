import { getProjectsPage } from "@/actions/projects";
import { ProjectsListClient } from "./projects-list-client";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const result = await getProjectsPage(1);

  if (!result.success) {
    redirect("/auth/sign-in");
  }

  return (
    <ProjectsListClient
      initialProjects={result.projects}
      initialTotal={result.total}
      initialHasMore={result.hasMore}
    />
  );
}
