"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface ProjectCardProject {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  updatedAt: Date;
}

interface ProjectCardProps {
  project: ProjectCardProject;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}

export function ProjectCard({ project, onDeleted, onRenamed }: ProjectCardProps) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleRename() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === project.name) {
      setIsRenaming(false);
      setNameValue(project.name);
      return;
    }

    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    if (res.ok) {
      onRenamed(project.id, trimmed);
      toast.success("Project renamed");
    } else {
      toast.error("Failed to rename project");
      setNameValue(project.name);
    }
    setIsRenaming(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });

    if (res.ok) {
      onDeleted(project.id);
      toast.success("Project deleted");
    } else {
      toast.error("Failed to delete project");
      setIsDeleting(false);
    }
  }

  return (
    <Card
      className="group overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => !isRenaming && router.push(`/dashboard/projects/${project.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-muted overflow-hidden">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <Input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setIsRenaming(false);
                  setNameValue(project.name);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm px-2"
            />
          ) : (
            <p className="truncate text-sm font-medium">{project.name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
