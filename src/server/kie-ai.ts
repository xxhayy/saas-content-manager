import { env } from "@/env";
import type { AssetCategory } from "@prisma/client";

// Shape of a kie.ai API JSON response
interface KieApiResponse {
  code?: number;
  msg?: string;
  id?: string;
  taskId?: string;
  data?: {
    taskId?: string;
    id?: string;
    state?: string;
    resultJson?: string;
    failedReason?: string;
  };
}

// Prompts optimized for white-background extraction and detail retention
export const CATEGORY_PROMPTS: Record<AssetCategory, string> = {
  FURNITURE: "Isolate and generate a professional studio photograph of the furniture item circled in the reference image. The furniture piece must be perfectly centered and isolated against a pure, plain white background. Shot in the style of a high-end e-commerce product catalog. Ultra-realistic, photorealistic, 8k resolution, sharp focus, capturing highly detailed material textures. Soft, even studio lighting with a subtle, natural drop shadow grounding the object. Maintain a strict 1:1 aspect ratio and ensure consistent scale and perspective.",
  COMMERCE_PRODUCT: "Studio photography of this watch, perfect pure white background, soft studio lighting, sharp focus, 8k resolution and ultra-realism, accurate colors, commercial product photography with a front facing view as if it were part of a catalog or website. The watch should be centered in the frame, occupying approximately 70% of the image height, positioned in the middle of the square canvas with equal spacing on all sides. Do not add any extra elements to the image.",
  AVATAR: "Studio portrait on a perfect pure white background, soft lighting, professional portrait photography, ultra detailed",
};

export async function submitTask(imageUrl: string, prompt: string, assetId: string) {
  // Aggressively clean the API key (strip quotes, Bearer prefix, and whitespace)
  let apiKey = env.KIE_AI_API_KEY.trim().replace(/^["']|["']$/g, '');
  if (apiKey.startsWith("Bearer ")) {
    apiKey = apiKey.replace("Bearer ", "").trim();
  }
  
  // Generate the absolute URL for the webhook matching our new route
  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie-ai?assetId=${assetId}`;

  console.log(`[kie.ai] Submitting task (Clean key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`);
  console.log(`[kie.ai] Webhook attached: ${webhookUrl}`);

  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      callBackUrl: webhookUrl,
      webhook: webhookUrl, // Keeping this just as a safety net 
      model: "nano-banana-2",
      input: {
        prompt: prompt,
        image_input: [imageUrl],
        aspect_ratio: "1:1",
        resolution: "1K",
        output_format: "png",
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as KieApiResponse | null;

  // Based on the OpenAPI spec, check for HTTP errors OR explicitly returned failure codes
  if (!response.ok || (data?.code && data.code !== 200)) {
    throw new Error(`kie.ai API Error [${data?.code ?? response.status}]: ${data?.msg ?? response.statusText}`);
  }

  // The id is typically stored here, depending on the exact successful response schema
  return data?.data?.taskId ?? data?.data?.id ?? data?.id ?? data?.taskId; 
}


