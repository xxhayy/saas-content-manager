import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headerPayload = await headers();
    const session = await auth.api.getSession({ headers: headerPayload });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = (await req.json()) as { name: string };

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    // Update the asset name only if it belongs to the user
    const { count } = await db.asset.updateMany({
      where: { 
        id,
        userId: session.user.id 
      },
      data: { name },
    });

    if (count === 0) {
      return Response.json({ error: "Asset not found or unauthorized" }, { status: 404 });
    }

    const asset = await db.asset.findUnique({ where: { id } });

    return Response.json({ asset });
  } catch (error) {
    console.error("Asset update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headerPayload = await headers();
    const session = await auth.api.getSession({ headers: headerPayload });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count } = await db.asset.deleteMany({
      where: { 
        id,
        userId: session.user.id 
      },
    });

    console.log(`[API] Delete Asset: ${id} for User: ${session.user.id}. Result: ${count} rows deleted.`);

    return Response.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error("Asset delete error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
