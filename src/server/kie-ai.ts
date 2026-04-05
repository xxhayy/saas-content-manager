import { env } from "@/env";
import { AssetCategory } from "../../generated/prisma";

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
  FURNITURE: "Studio photography of this furniture item, perfect pure white background, soft studio lighting, ultra detailed, 8k resolution, product photography",
  COMMERCE_PRODUCT: "Studio photography of this product, perfect pure white background, soft studio lighting, sharp focus, 8k resolution, commercial product photography",
  AVATAR: "Studio portrait on a perfect pure white background, soft lighting, professional portrait photography, ultra detailed",
};

export async function submitTask(imageUrl: string, prompt: string) {
  // Aggressively clean the API key (strip quotes, Bearer prefix, and whitespace)
  let apiKey = env.KIE_AI_API_KEY.trim().replace(/^["']|["']$/g, '');
  if (apiKey.startsWith("Bearer ")) {
    apiKey = apiKey.replace("Bearer ", "").trim();
  }
  
  console.log(`[kie.ai] Submitting task (Clean key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`);
  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function pollTask(taskId: string) {
  let apiKey = env.KIE_AI_API_KEY.trim().replace(/^["']|["']$/g, '');
  if (apiKey.startsWith("Bearer ")) {
    apiKey = apiKey.replace("Bearer ", "").trim();
  }
  // Poll every 4 seconds until done (max 15 attempts = 60s)
  for (let i = 0; i < 15; i++) {
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const jsonResponse = (await response.json().catch(() => null)) as KieApiResponse | null;

    if (!response.ok || (jsonResponse?.code && jsonResponse.code !== 200)) {
       throw new Error(`kie.ai API Error [${jsonResponse?.code ?? response.status}]: ${jsonResponse?.msg ?? response.statusText}`);
    }

    const data = jsonResponse?.data ?? {};

    if (data.state === "success") {
      const resultObj = JSON.parse(data.resultJson ?? "{}") as { resultUrls?: string[] };
      return { success: true, imageUrl: resultObj.resultUrls?.[0] };
    }

    if (data.state === "fail" || data.state === "failed") {
      return { success: false, error: data.failedReason ?? "kie.ai processing failed" };
    }

    // Wait 4 seconds before trying again
    await delay(4000);
  }

  return { success: false, error: "Polling timed out after 60 seconds" };
}
