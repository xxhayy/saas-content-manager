import type { NextRequest } from "next/server";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";
import type { AssetCategory } from "../../../../../generated/prisma";
import { submitTask, CATEGORY_PROMPTS } from "@/server/kie-ai";

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

    const prompt = CATEGORY_PROMPTS[body.category];

    console.log(`[Upload] Starting submission of ${assets.length} assets to Kie.ai...`);
    
    // Submit tasks to Kie.ai immediately in parallel
    await Promise.all(assets.map(async (asset) => {
      try {
        const taskId = await submitTask(asset.originalUrl, prompt, asset.id);
        if (taskId) {
          await db.asset.update({
            where: { id: asset.id },
            data: { kieTaskId: taskId },
          });
        }
      } catch (err) {
        console.error(`[Upload] Failed to submit asset ${asset.id} to Kie.ai:`, err);
        await db.asset.update({
             where: { id: asset.id },
             data: { 
               status: "FAILED", 
               kieError: err instanceof Error ? err.message : "Failed to submit to Kie.ai API" 
             }
        });
      }
    }));

    return Response.json({
      message: "Upload submitted",
      assetIds: assets.map((a) => a.id),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
