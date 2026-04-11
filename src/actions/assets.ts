"use server";

import { db } from "@/server/db";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";

export async function getUserAssets() {
  try {
    const headerPayload = await headers();
    const session = await auth.api.getSession({
      headers: headerPayload,
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const assets = await db.asset.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, assets };
  } catch (error) {
    console.error("Assets fetch error:", error);
    return { success: false, error: "Failed to fetch assets" };
  }
}
