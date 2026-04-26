"use server";

import { db } from "@/server/db";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";

const PROJECTS_PAGE_SIZE = 12;

async function getAuthenticatedUserId() {
  const headerPayload = await headers();
  const session = await auth.api.getSession({ headers: headerPayload });
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Paginated list of projects for the current user. */
export async function getProjectsPage(page = 1) {
  try {
    const userId = await getAuthenticatedUserId();
    const skip = (page - 1) * PROJECTS_PAGE_SIZE;

    const [projects, total] = await db.$transaction([
      db.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        skip,
        take: PROJECTS_PAGE_SIZE,
      }),
      db.project.count({ where: { userId } }),
    ]);

    return {
      success: true as const,
      projects,
      total,
      page,
      hasMore: skip + projects.length < total,
    };
  } catch (error) {
    console.error("Projects fetch error:", error);
    return { success: false as const, error: "Failed to fetch projects" };
  }
}

/** Single project with all its generations — used by the editor page. */
export async function getProject(projectId: string) {
  try {
    const userId = await getAuthenticatedUserId();

    const project = await db.project.findUnique({
      where: { id: projectId, userId },
      include: {
        generations: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) return { success: false as const, error: "Project not found" };

    return { success: true as const, project };
  } catch (error) {
    console.error("Project fetch error:", error);
    return { success: false as const, error: "Failed to fetch project" };
  }
}

/** Re-fetch just the generations for a project — used by the polling loop. */
export async function refreshGenerations(projectId: string) {
  try {
    const userId = await getAuthenticatedUserId();

    const project = await db.project.findUnique({
      where: { id: projectId, userId },
      select: { id: true },
    });

    if (!project) return { success: false as const, error: "Project not found" };

    const generations = await db.projectGeneration.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return { success: true as const, generations };
  } catch (error) {
    console.error("Generations refresh error:", error);
    return { success: false as const, error: "Failed to refresh generations" };
  }
}

/** Returns only COMPLETED assets — for the Reference Node asset picker. */
export async function getCompletedAssets() {
  try {
    const userId = await getAuthenticatedUserId();

    const assets = await db.asset.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        cleanUrl: true,
        originalUrl: true,
      },
    });

    return { success: true as const, assets };
  } catch (error) {
    console.error("Completed assets fetch error:", error);
    return { success: false as const, error: "Failed to fetch assets" };
  }
}
