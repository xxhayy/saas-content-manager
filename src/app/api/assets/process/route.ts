import type { NextRequest } from "next/server";
import { env } from "@/env";
import { db } from "@/server/db";
import { submitTask, pollTask, CATEGORY_PROMPTS } from "@/server/kie-ai";
import { uploadToImageKit } from "@/server/imagekit";

const MAX_RETRIES = 3;

export const maxDuration = 60; // 1 minute is plenty with our 10s granular polling

export async function POST(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get("x-internal-secret");
  if (secret !== env.INTERNAL_API_SECRET) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { userId: string };
  console.log(`[Worker] Checking tasks for user: ${body.userId}`);

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

    const prompt = CATEGORY_PROMPTS[asset.category];
    let nextDelay = 2000; // Default delay for next check

    try {
      if (!asset.kieTaskId) {
        // STEP 1: Submit to kie.ai
        console.log(`[Worker] Submitting asset ${asset.id} to kie.ai`);
        const taskId = await submitTask(asset.originalUrl, prompt);
        
        if (!taskId) throw new Error("No taskId returned from kie.ai");

        await db.asset.update({
          where: { id: asset.id },
          data: { kieTaskId: taskId },
        });

        console.log(`[Worker] Submitted. TaskId: ${taskId}. Re-queueing for poll.`);
        nextDelay = 5000; // Wait 5s before first poll
      } else {
        // STEP 2: Poll existing task
        console.log(`[Worker] Polling kie.ai for asset ${asset.id} (TaskId: ${asset.kieTaskId})`);
        const result = await pollTask(asset.kieTaskId);

        if (result.state === "success") {
          console.log(`[Worker] Asset ${asset.id} succeeded. Uploading...`);
          const cleanUrl = await uploadToImageKit(
            result.imageUrl,
            `clean-${asset.id}.png`,
            "/assets/clean"
          );

          await db.asset.update({
            where: { id: asset.id },
            data: {
              cleanUrl,
              status: "COMPLETED",
              name: `Asset ${asset.id.slice(-6)}`,
            },
          });
          nextDelay = 1000; // Move quickly to next asset
        } else if (result.state === "failed") {
          console.error(`[Worker] Asset ${asset.id} failed: ${result.error}`);
          throw new Error(result.error);
        } else {
          // Still pending
          console.log(`[Worker] Asset ${asset.id} still processing. Re-queueing...`);
          nextDelay = 10000; // Small wait to avoid overwhelming the API
        }
      }
    } catch (processingError) {
      const errorMessage = processingError instanceof Error ? processingError.message : "Unknown error";
      console.error(`[Worker] Error processing asset ${asset.id}:`, errorMessage);

      if (asset.retryCount + 1 >= MAX_RETRIES) {
        await db.asset.update({
          where: { id: asset.id },
          data: { 
            status: "FAILED", 
            retryCount: asset.retryCount + 1,
            kieError: errorMessage 
          },
        });
      } else {
        await db.asset.update({
          where: { id: asset.id },
          data: { retryCount: asset.retryCount + 1 },
        });
      }
      nextDelay = 2000;
    }

    // Chain: check if more/still PROCESSING assets exist
    const remaining = await db.asset.count({
      where: { userId: body.userId, status: "PROCESSING" },
    });

    if (remaining > 0) {
      const baseUrl = req.nextUrl.origin;
      console.log(`[Worker] ${remaining} assets still need attention. Triggering next worker in ${nextDelay}ms`);
      setTimeout(() => {
        void fetch(`${baseUrl}/api/assets/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({ userId: body.userId }),
        });
      }, nextDelay);
    }

    return Response.json({ message: "Task handled", assetId: asset.id });
  } catch (error) {
    console.error("Process-next fatal error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
