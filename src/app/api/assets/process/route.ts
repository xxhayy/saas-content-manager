import { NextRequest } from "next/server";
import { env } from "@/env";
import { db } from "@/server/db";
import { submitTask, pollTask, CATEGORY_PROMPTS } from "@/server/kie-ai";
import { uploadToImageKit } from "@/server/imagekit";

const MAX_RETRIES = 3;

export async function POST(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret !== env.INTERNAL_API_SECRET) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string };
  console.log(`[Worker] Started process for user: ${body.userId}`);

  try {
    // Find the oldest PROCESSING asset for this user
    const asset = await db.asset.findFirst({
      where: { userId: body.userId, status: "PROCESSING" },
      orderBy: { createdAt: "asc" },
    });

    if (!asset) {
      console.log(`[Worker] No processing assets found for user: ${body.userId}`);
      return Response.json({ message: "No assets to process" });
    }

    console.log(`[Worker] Processing asset: ${asset.id} (${asset.category})`);

    // Get the category-specific prompt
    const prompt = CATEGORY_PROMPTS[asset.category];

    try {
      // Submit to kie.ai
      const taskId = await submitTask(asset.originalUrl, prompt);

      if (!taskId) {
        throw new Error("No taskId returned from kie.ai");
      }

      // Poll until done
      const result = await pollTask(taskId);

      if (result.success && result.imageUrl) {
        console.log(`[Worker] Successfully processed asset ${asset.id}`);
        // Upload clean image to ImageKit
        const cleanUrl = await uploadToImageKit(
          result.imageUrl,
          `clean-${asset.id}.png`,
          "/assets/clean"
        );

        // Update DB → COMPLETED
        await db.asset.update({
          where: { id: asset.id },
          data: {
            cleanUrl,
            status: "COMPLETED",
            name: `Asset ${asset.id.slice(-6)}`,
          },
        });
      } else {
        console.error(`[Worker] AI processing failed for asset ${asset.id}: ${result.error}`);
        throw new Error(result.error ?? "Processing failed");
      }
    } catch (processingError) {
      console.error(`Processing failed for asset ${asset.id}:`, processingError);

      if (asset.retryCount + 1 >= MAX_RETRIES) {
        // Mark as FAILED after max retries
        await db.asset.update({
          where: { id: asset.id },
          data: { status: "FAILED", retryCount: asset.retryCount + 1 },
        });
      } else {
        // Increment retry count, keep as PROCESSING for next pass
        await db.asset.update({
          where: { id: asset.id },
          data: { retryCount: asset.retryCount + 1 },
        });
      }
    }

    // Chain: check if more PROCESSING assets exist, call self again
    const remaining = await db.asset.count({
      where: { userId: body.userId, status: "PROCESSING" },
    });

    if (remaining > 0) {
      const baseUrl = req.nextUrl.origin;
      // Small delay to prevent recursion depth issues and overwhelming the API
      setTimeout(() => {
        void fetch(`${baseUrl}/api/assets/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({ userId: body.userId }),
        });
      }, 2000);
    }

    return Response.json({ message: "Processed" });
  } catch (error) {
    console.error("Process-next error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
