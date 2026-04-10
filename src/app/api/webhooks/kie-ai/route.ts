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
    
    if (!assetId) {
      console.error("[Webhook] Missing assetId in query params");
      return Response.json({ error: "Missing assetId" }, { status: 400 });
    }

    // Find the asset
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    
    if (!asset) {
      console.error(`[Webhook] Asset not found: ${assetId}`);
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }

    const state = data.state ?? data.data?.state;
    
    // If the asset is already completed (maybe duplicate webhook), simply return ok
    if (asset.status === "COMPLETED") {
       return Response.json({ success: true, message: "Already completed" });
    }
    
    if (state === "success") {
      // Parse result URLs
      const resultJsonStr = data.resultJson ?? data.data?.resultJson;
      const resultObj = (resultJsonStr ? JSON.parse(resultJsonStr) : {}) as { resultUrls?: string[] };
      const imageUrl = resultObj.resultUrls?.[0] ?? data.resultUrls?.[0]; // Fallbacks just in case

      if (!imageUrl) {
        throw new Error("Success state but no image URL provided by Kie");
      }

      console.log(`[Webhook] Success for asset ${assetId}. Uploading to ImageKit...`);
      const cleanUrl = await uploadToImageKit(
        imageUrl,
        `clean-${asset.id}.png`,
        "/assets/clean"
      );

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
        data: {
          status: "FAILED",
          kieError: failedReason,
        },
      });
    } else {
      console.log(`[Webhook] Received unhandled state for ${assetId}: ${state}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
