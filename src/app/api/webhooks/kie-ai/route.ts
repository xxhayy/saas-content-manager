import type { NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "@/env";
import { db } from "@/server/db";
import { uploadToImageKit } from "@/server/imagekit";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    type KieWebhookPayload = {
      taskId?: string;
      id?: string;
      state?: string;
      resultUrls?: string[];
      resultJson?: string;
      failedReason?: string;
      data?: {
        taskId?: string;
        state?: string;
        resultJson?: string;
        failedReason?: string;
      };
    };

    // 1. HMAC Verification (if secret provided)
    const signature = req.headers.get("X-Webhook-Signature");
    const timestamp = req.headers.get("X-Webhook-Timestamp");
    
    if (env.KIE_WEBHOOK_SECRET && signature && timestamp) {
      // Kie webhook signature rule: base64(HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey))
      const bodyParams = JSON.parse(rawBody) as KieWebhookPayload;
      const taskId = bodyParams.taskId ?? bodyParams.data?.taskId ?? bodyParams.id;
      
      const payloadString = `${taskId}.${timestamp}`;
      const expectedSignature = crypto
        .createHmac("sha256", env.KIE_WEBHOOK_SECRET)
        .update(payloadString)
        .digest("base64");
        
      if (signature !== expectedSignature) {
        console.error("[Webhook] HMAC signature mismatch. Rejecting request.");
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (env.KIE_WEBHOOK_SECRET) {
       console.warn("[Webhook] Missing signature headers on request but secret is configured.");
    }

    // 2. Parse the payload
    const data = JSON.parse(rawBody) as KieWebhookPayload;
    
    // We expect assetId in the query string based on our submission logic
  const assetId = req.nextUrl.searchParams.get("assetId");
const generationId = req.nextUrl.searchParams.get("generationId");

if (!assetId && !generationId) {
  console.error("[Webhook] Missing assetId or generationId in query params");
  return Response.json({ error: "Missing assetId or generationId" }, { status: 400 });
}

  if (assetId) {
  const asset = await db.asset.findUnique({ where: { id: assetId } });

  if (!asset) {
    console.error(`[Webhook] Asset not found: ${assetId}`);
    return Response.json({ error: "Asset not found" }, { status: 404 });
  }

  const state = data.state ?? data.data?.state;

  if (asset.status === "COMPLETED") {
    return Response.json({ success: true, message: "Already completed" });
  }

  if (state === "success") {
    const resultJsonStr = data.resultJson ?? data.data?.resultJson;
    const resultObj = (resultJsonStr ? JSON.parse(resultJsonStr) : {}) as { resultUrls?: string[] };
    const imageUrl = resultObj.resultUrls?.[0] ?? data.resultUrls?.[0];

    if (!imageUrl) {
      throw new Error("Success state but no image URL provided by Kie");
    }

    console.log(`[Webhook] Success for asset ${assetId}. Uploading to ImageKit...`);
    const cleanUrl = await uploadToImageKit(imageUrl, `clean-${asset.id}.png`, "/assets/clean");

    await db.asset.update({
      where: { id: assetId },
      data: {
        cleanUrl,
        status: "COMPLETED",
        name: asset.name ?? `Asset ${asset.id.slice(-6)}`,
      },
    });
    console.log(`[Webhook] Asset ${assetId} fully completed!`);

  } else if (state === "fail" || state === "failed") {
    const failedReason = data.failedReason ?? data.data?.failedReason ?? "Unknown Kie error";
    console.error(`[Webhook] Kie processing failed for asset ${assetId}: ${failedReason}`);

    await db.asset.update({
      where: { id: assetId },
      data: { status: "FAILED", kieError: failedReason },
    });
  } else {
    console.log(`[Webhook] Received unhandled state for ${assetId}: ${state}`);
  }
  } else if (generationId) {
  const generation = await db.projectGeneration.findUnique({
    where: { id: generationId },
    include: { project: true },
  });

  if (!generation) {
    console.error(`[Webhook] ProjectGeneration not found: ${generationId}`);
    return Response.json({ error: "Generation not found" }, { status: 404 });
  }

  if (generation.status === "COMPLETED") {
    return Response.json({ success: true, message: "Already completed" });
  }

  const state = data.state ?? data.data?.state;

  if (state === "success") {
    const resultJsonStr = data.resultJson ?? data.data?.resultJson;
    const resultObj = (resultJsonStr ? JSON.parse(resultJsonStr) : {}) as { resultUrls?: string[] };
    const imageUrl = resultObj.resultUrls?.[0] ?? data.resultUrls?.[0];

    if (!imageUrl) {
      throw new Error("Success state but no image URL provided by Kie");
    }

    console.log(`[Webhook] Success for generation ${generationId}. Uploading to ImageKit...`);
    const storedUrl = await uploadToImageKit(
      imageUrl,
      `gen-${generation.id}.png`,
      `/projects/${generation.projectId}/generations`
    );

    await db.projectGeneration.update({
      where: { id: generationId },
      data: {
        imageUrl: storedUrl,
        resultUrl: imageUrl,
        status: "COMPLETED",
      },
    });
    console.log(`[Webhook] Generation ${generationId} fully completed!`);

  } else if (state === "fail" || state === "failed") {
    const failedReason = data.failedReason ?? data.data?.failedReason ?? "Unknown Kie error";
    console.error(`[Webhook] Kie processing failed for generation ${generationId}: ${failedReason}`);

    await db.projectGeneration.update({
      where: { id: generationId },
      data: { status: "FAILED", kieError: failedReason },
    });
  } else {
    console.log(`[Webhook] Received unhandled state for generation ${generationId}: ${state}`);
  }
}


    return Response.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
