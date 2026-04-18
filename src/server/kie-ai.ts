import { env } from "@/env";
import type { AssetCategory } from "@prisma/client";

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

// Step 1: Replace these URLs with your actual reference images hosted on ImageKit
export const CATEGORY_REFERENCES: Record<AssetCategory, string> = {
  FURNITURE: "https://ik.imagekit.io/aironestu/assets/references/furniture.png",
  COMMERCE_PRODUCT: "https://ik.imagekit.io/aironestu/assets/references/watch.jpg",
  AVATAR: "https://ik.imagekit.io/aironestu/assets/references/avartar.png",
};

const BASE_PROMPT =
  "Generate a Studio photography of [Image 2 - Core Subject], in a perfect pure white background, soft studio lighting, sharp focus, 8k resolution, commercial product photography, [Image 1 - Size Template] is a size guide, [Image 2 - Core Subject] is the product to be generated, for more context: " +
  "[Image 1 - Size Template]: Use this exclusively for spatial scale — do not use it as a design element, only use it as a size guide. " +
  "[Image 2 - Core Subject]: Photo of the product. " +
  "The final result a high-end shot [Image 1 - Core Subject] taken a professional white background for a brand’s catalog website. Do not change the design or color of the subject, do not hallucinate details that are not present in the reference image.";

export const CATEGORY_PROMPTS: Record<AssetCategory, string> = {
  FURNITURE: BASE_PROMPT + " The subject is a furniture item.",
  COMMERCE_PRODUCT: BASE_PROMPT + " The subject is a watch.",
  AVATAR: BASE_PROMPT + " The subject is a person; preserve facial features, skin tone, and clothing exactly.",
};

export async function submitTask(imageUrl: string, category: AssetCategory, assetId: string) {
  let apiKey = env.KIE_AI_API_KEY.trim().replace(/^["']|["']$/g, '');
  if (apiKey.startsWith("Bearer ")) {
    apiKey = apiKey.replace("Bearer ", "").trim();
  }

  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie-ai?assetId=${assetId}`;
  const referenceImage = CATEGORY_REFERENCES[category];

  const refFilename = referenceImage.split("/").pop() ?? "image1";
  const subjectFilename = imageUrl.split("/").pop()?.split("?")[0] ?? "image2";
  const prompt = (CATEGORY_PROMPTS[category] ?? "")
    .replaceAll("Image 1", refFilename)
    .replaceAll("Image 2", subjectFilename);

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
      webhook: webhookUrl,
      model: "nano-banana-2",
      input: {
        prompt,
        image_input: [referenceImage, imageUrl],
        aspect_ratio: "1:1",
        resolution: "1K",
        output_format: "png",
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as KieApiResponse | null;

  if (!response.ok || (data?.code && data.code !== 200)) {
    throw new Error(`kie.ai API Error [${data?.code ?? response.status}]: ${data?.msg ?? response.statusText}`);
  }

  return data?.data?.taskId ?? data?.data?.id ?? data?.id ?? data?.taskId;
}
