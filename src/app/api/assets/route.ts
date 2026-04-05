import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";
// Root is 4 levels up from this folder
import type { AssetCategory } from "../../../../generated/prisma";

export async function GET(req: NextRequest) {
  try {
    const headerPayload = await headers();
    const session = await auth.api.getSession({ headers: headerPayload });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = req.nextUrl.searchParams.get("category") as AssetCategory | null;

    const assets = await db.asset.findMany({
      where: {
        userId: session.user.id,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ assets });
  } catch (error) {
    console.error("Assets list error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
