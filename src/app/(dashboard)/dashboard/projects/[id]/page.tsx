import { getProject } from "@/actions/projects";
import { ProjectEditorClient } from "./project-editor-client";
import { redirect } from "next/navigation";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProject(id);

  if (!result.success) {
    redirect("/dashboard/projects");
  }

  return <ProjectEditorClient project={result.project} />;
}
