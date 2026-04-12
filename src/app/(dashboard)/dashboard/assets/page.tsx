import { getAssetsPage } from "@/actions/assets";
import { AssetsClient } from "./assets-client";
import type { Asset } from "@/components/assets/asset-card";
import { redirect } from "next/navigation";

export default async function AssetsPage() {
  const result = await getAssetsPage(1);

  if (!result.success) {
    // Unauthorized or DB error — send to sign-in
    redirect("/auth/sign-in");
  }

  return (
    <AssetsClient
      initialAssets={result.assets as unknown as Asset[]}
      initialTotal={result.total}
      initialHasMore={result.hasMore}
    />
  );
}
