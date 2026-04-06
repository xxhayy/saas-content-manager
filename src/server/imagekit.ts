import ImageKit from "imagekit";

import { env } from "@/env";

// Initialize ImageKit using validated env vars from @/env
export const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Downloads a file from a URL and uploads it to ImageKit.
 * @param fileUrl  - Source URL to download (e.g. a kie.ai generated image URL)
 * @param fileName - What to name the file in ImageKit
 * @param folder   - ImageKit folder path (e.g. "/assets/clean" or "/assets/originals")
 * @returns        - The public ImageKit URL of the uploaded file
 */
export async function uploadToImageKit(
  fileUrl: string,
  fileName: string,
  folder: string
): Promise<string> {
  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const result = await imagekit.upload({
    file: buffer,
    fileName: fileName,
    folder: folder,
    useUniqueFileName: true,
  });

  return result.url;
}
