import { getUploadAuthParams } from "@imagekit/next/server";
import { env } from "@/env";

export async function GET() {
  try {
    // 1. Generate the auth parameters safely using the lightweight helper
    // Session check removed per user request for simplicity (middleware protection planned)
    const { token, expire, signature } = getUploadAuthParams({
        publicKey: env.IMAGEKIT_PUBLIC_KEY,
        privateKey: env.IMAGEKIT_PRIVATE_KEY,
    });

    // 2. Return them to the client along with the endpoint and public key
    return Response.json({
        token,
        expire,
        signature,
        publicKey: env.IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });

  } catch (error) {
     console.error("Auth Route Error:", error);
     return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
