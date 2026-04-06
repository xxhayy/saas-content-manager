import { headers } from "next/headers";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";

export async function GET() {
  try {
    const headerPayload = await headers();
    const session = await auth.api.getSession({ headers: headerPayload });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assets = await db.asset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return Response.json({ assets });
  } catch (error) {
    console.error("Recent assets error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
