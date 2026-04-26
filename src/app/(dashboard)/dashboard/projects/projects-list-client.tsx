"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard, type ProjectCardProject } from "@/components/projects/project-card";
import { getProjectsPage } from "@/actions/projects";
import { toast } from "sonner";

interface ProjectsListClientProps {
  initialProjects: ProjectCardProject[];
  initialTotal: number;
  initialHasMore: boolean;
}

export function ProjectsListClient({
  initialProjects,
  initialTotal,
  initialHasMore,
}: ProjectsListClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function handleNewProject() {
    setIsCreating(true);
    const res = await fetch("/api/projects", { method: "POST" });

    if (res.ok) {
      const data = (await res.json()) as { project: { id: string } };
      router.push(`/dashboard/projects/${data.project.id}`);
    } else {
      toast.error("Failed to create project");
      setIsCreating(false);
    }
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await getProjectsPage(nextPage);

    if (result.success) {
      setProjects((prev) => [...prev, ...result.projects]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } else {
      toast.error("Failed to load more projects");
    }
    setIsLoadingMore(false);
  }

  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleRenamed(id: string, name: string) {
   setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));

  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialTotal} {initialTotal === 1 ? "project" : "projects"}
          </p>
        </div>
        <Button
          onClick={handleNewProject}
          disabled={isCreating}
          className="rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "New Project"}
        </Button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first project to start building visual scenes.
          </p>
          <Button onClick={handleNewProject} disabled={isCreating} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            {isCreating ? "Creating..." : "New Project"}
          </Button>
        </div>
      )}

      {/* Grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDeleted={handleDeleted}
              onRenamed={handleRenamed}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-xl"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
