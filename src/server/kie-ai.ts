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
//==================================================================
interface ProjectTaskParams {
  prompt: string;
  imageInputs: string[];
  aspectRatio?: string;
  model?: string;
  resolution?: string;
  generationId: string;
  projectId: string;
  seed?: number;
}

//=================================================================


// add new URLs for reference images.
export const CATEGORY_REFERENCES: Record<AssetCategory, string> = {
  FURNITURE: "https://ik.imagekit.io/aironestu/assets/references/furniture.png",
  COMMERCE_PRODUCT: "https://ik.imagekit.io/aironestu/assets/references/commerce-product.png",
  AVATAR: "https://ik.imagekit.io/aironestu/assets/references/avartar.png",
  MENS_WATCH: "https://ik.imagekit.io/aironestu/assets/references/mens-watch.jpg",
  WOMENS_WATCH: "https://ik.imagekit.io/aironestu/assets/references/womens-watch.png",
};

const BASE_PROMPT_WATCH =
  "Generate a Studio photography of [Image 2 - Core Subject], in a perfect pure white background, soft studio lighting, sharp focus, 8k resolution, commercial product photography, [Image 1 - Size Template] is a size guide, [Image 2 - Core Subject] is the product to be generated, for more context: " +
  "[Image 1 - Size Template]: Use this exclusively for spatial scale — do not use it as a design element, only use it as a size guide. " +
  "[Image 2 - Core Subject]: Photo of the watch. " +
  "The final result a high-end shot [Image 1 - Core Subject] taken a professional white background for a brand’s catalog website. Do not change the design or color of [Image 2 - Core Subject], do not hallucinate details that are not present in [Image 2 - Core Subject].";

const BASE_PROMPT = "Generate a studio photography of a the subject in a stunning white background as if though it were part of a product catalog of a retail website:" +
"[Image 1] - serves as a template for the composition, [Image 2]- serves as the user input for the image to be generated";

export const CATEGORY_PROMPTS: Record<AssetCategory, string> = {
  FURNITURE: BASE_PROMPT + " The subject is a furniture item.",
  COMMERCE_PRODUCT: BASE_PROMPT + " The subject is a commerce product.",
  AVATAR: BASE_PROMPT + " The subject is a person; preserve facial features, skin tone, and clothing exactly.",
  MENS_WATCH: BASE_PROMPT + "this is a mens sized watch",
  WOMENS_WATCH: BASE_PROMPT + "this is a small sized womens watch.",
};

//Assets Generator
//=================================================================
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
      model: "google/nano-banana-edit",
      input: {
        prompt,
        image_urls: [referenceImage, imageUrl],
        image_size: "1:1",
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
//=================================================================



//Projects Generator
//=================================================================
export async function submitProjectTask(params: ProjectTaskParams): Promise<string | undefined> {
  let apiKey = env.KIE_AI_API_KEY.trim().replace(/^["']|["']$/g, "");
  if (apiKey.startsWith("Bearer ")) {
    apiKey = apiKey.replace("Bearer ", "").trim();
  }

  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie-ai?generationId=${params.generationId}&projectId=${params.projectId}`;

  console.log(`[kie.ai] Submitting project task for generation ${params.generationId}`);

  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      callBackUrl: webhookUrl,
      webhook: webhookUrl,
      model: params.model ?? "nano-banana-2",
      input: {
        prompt: params.prompt,
        image_input: params.imageInputs,
        aspect_ratio: params.aspectRatio ?? "1:1",
        resolution: params.resolution ?? "1K",
        output_format: "png",
        ...(params.seed !== undefined && { seed: params.seed }),
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as KieApiResponse | null;

  if (!response.ok || (data?.code && data.code !== 200)) {
    throw new Error(
      `kie.ai API Error [${data?.code ?? response.status}]: ${data?.msg ?? response.statusText}`,
    );
  }

  return data?.data?.taskId ?? data?.data?.id ?? data?.id ?? data?.taskId;
}
