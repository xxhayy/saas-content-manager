import type { NextRequest } from "next/server";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";
import { env } from "@/env";
import type { AssetCategory } from "../../../../../generated/prisma";

export async function POST(req: NextRequest) {
  try {
     const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      originalUrls: string[];
      category: AssetCategory;
    };

    if (!body.originalUrls?.length || !body.category) {
      return Response.json({ error: "Missing originalUrls or category" }, { status: 400 });
    }

    if (body.originalUrls.length > 10) {
      return Response.json({ error: "Maximum 10 images per upload" }, { status: 400 });
    }

    // Create one Asset record per image, all with status PROCESSING
    const assets = await db.$transaction(
      body.originalUrls.map((url) =>
        db.asset.create({
          data: {
            originalUrl: url,
            category: body.category,
            userId: session.user.id,
            status: "PROCESSING",
          },
        })
      )
    );

    // Fire-and-forget: kick off the processing chain
    const baseUrl = req.nextUrl.origin;
    console.log(`[Queue Trigger] Calling: ${baseUrl}/api/assets/process for user ${session.user.id}`);
    void fetch(`${baseUrl}/api/assets/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ userId: session.user.id }),
    }).then(res => {
      if (!res.ok) console.error(`[Queue Trigger] Failed with status ${res.status}`);
      else console.log(`[Queue Trigger] Success status ${res.status}`);
    }).catch(err => {
      console.error(`[Queue Trigger] Fetch error:`, err);
    });

    return Response.json({
      message: "Upload submitted",
      assetIds: assets.map((a) => a.id),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
