"use server";

import { db } from "@/server/db";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";

const ASSETS_PAGE_SIZE = 20;

async function getAuthenticatedUserId() {
  const headerPayload = await headers();
  const session = await auth.api.getSession({ headers: headerPayload });
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Fetch a single page of assets (used for initial load and load-more). */
export async function getAssetsPage(page = 1) {
  try {
    const userId = await getAuthenticatedUserId();
    const skip = (page - 1) * ASSETS_PAGE_SIZE;

    const [assets, total] = await db.$transaction([
      db.asset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: ASSETS_PAGE_SIZE,
      }),
      db.asset.count({ where: { userId } }),
    ]);

    return {
      success: true as const,
      assets,
      total,
      page,
      hasMore: skip + assets.length < total,
    };
  } catch (error) {
    console.error("Assets fetch error:", error);
    return { success: false as const, error: "Failed to fetch assets" };
  }
}

/**
 * Re-fetch the first `take` assets in one shot — used by the polling loop to
 * refresh statuses for however many assets are currently loaded on screen.
 */
export async function refreshAssets(take: number) {
  try {
    const userId = await getAuthenticatedUserId();

    const assets = await db.asset.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });

    return { success: true as const, assets };
  } catch (error) {
    console.error("Assets refresh error:", error);
    return { success: false as const, error: "Failed to refresh assets" };
  }
}

/** @deprecated Use getAssetsPage instead */
export async function getUserAssets() {
  return getAssetsPage(1);
}
