"use client";

import { createContext, useContext } from "react";
import type { ProjectGeneration } from "@prisma/client";

interface ProjectContextValue {
  projectId: string;
  generations: ProjectGeneration[];
  onGenerationsUpdate: (gens: ProjectGeneration[]) => void;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectContext.Provider");
  return ctx;
}
