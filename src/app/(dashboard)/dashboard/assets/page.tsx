"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Download, CheckSquare, X } from "lucide-react";
import { AssetCard } from "@/components/assets/asset-card";
import type { Asset } from "@/components/assets/asset-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/better-auth/client";
import { getUserAssets } from "@/actions/assets";
import { toast } from "sonner";

export default function AssetsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchAssets = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        router.push("/auth/sign-in");
        return;
      }

      const assetsResult = await getUserAssets();
      if (assetsResult.success && assetsResult.assets) {
        setUserAssets(assetsResult.assets as unknown as Asset[]);
      } else {
        console.error("Failed to fetch assets via action:", assetsResult.error);
        toast.error(`Error loading assets: ${assetsResult.error}`);
      }
    } catch (error) {
      console.error("Assets lookup failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load assets");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [router]);

  // Initial load
  useEffect(() => {
    void fetchAssets(true);
  }, [fetchAssets]);

  // Smart Polling: Only poll if any asset is PROCESSING
  useEffect(() => {
    const isProcessing = userAssets.some((a) => a.status === "PROCESSING");
    if (!isProcessing) return;

    const interval = setInterval(() => {
      void fetchAssets();
    }, 5000);

    return () => clearInterval(interval);
  }, [userAssets, fetchAssets]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleDownload = useCallback(async () => {
    const toDownload = userAssets.filter(
      (a) => selectedIds.has(a.id) && a.status === "COMPLETED" && a.cleanUrl
    );

    if (toDownload.length === 0) {
      toast.error("No completed assets selected.");
      return;
    }

    toast.info(`Downloading ${toDownload.length} file(s)...`);

    for (const asset of toDownload) {
      try {
        const response = await fetch(asset.cleanUrl!);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = asset.name ?? `asset-${asset.id}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small delay to avoid browser popup blockers on rapid-fire downloads
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        toast.error(`Failed to download ${asset.name ?? asset.id}`);
      }
    }

    handleExitSelectMode();
  }, [userAssets, selectedIds, handleExitSelectMode]);

  const furniture = userAssets.filter((a) => a.category === "FURNITURE");
  const commerce = userAssets.filter((a) => a.category === "COMMERCE_PRODUCT");
  const avatars = userAssets.filter((a) => a.category === "AVATAR");

  const renderGrid = (assets: Asset[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          isSelectMode={isSelectMode}
          isSelected={selectedIds.has(asset.id)}
          onToggleSelect={handleToggleSelect}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading Assets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your creative components across projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSelectMode ? (
            <>
              {selectedIds.size > 0 && (
                <Button
                  onClick={handleDownload}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm animate-in fade-in duration-200"
                >
                  <Download className="size-4 mr-2" />
                  Download ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExitSelectMode}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              >
                <X className="size-4 mr-2" />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsSelectMode(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              >
                <CheckSquare className="size-4 mr-2" />
                Select
              </Button>
              <Link href="/dashboard/assets/new">
                <Button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-sm">
                  <Plus className="size-4 mr-2" />
                  New Asset
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
            <TabsTrigger value="all" className="rounded-lg px-4">All Assets</TabsTrigger>
            <TabsTrigger value="FURNITURE" className="rounded-lg px-4">Furniture</TabsTrigger>
            <TabsTrigger value="COMMERCE_PRODUCT" className="rounded-lg px-4">Commerce</TabsTrigger>
            <TabsTrigger value="AVATAR" className="rounded-lg px-4">Avatars</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input
                type="text"
                placeholder="Search assets..."
                className="w-full lg:w-[280px] rounded-xl border border-border bg-card/50 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">{renderGrid(userAssets)}</TabsContent>
        <TabsContent value="FURNITURE" className="mt-0 outline-none">{renderGrid(furniture)}</TabsContent>
        <TabsContent value="COMMERCE_PRODUCT" className="mt-0 outline-none">{renderGrid(commerce)}</TabsContent>
        <TabsContent value="AVATAR" className="mt-0 outline-none">{renderGrid(avatars)}</TabsContent>
      </Tabs>
    </div>
  );
}
