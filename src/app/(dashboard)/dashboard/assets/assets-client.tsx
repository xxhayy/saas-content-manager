"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Download, CheckSquare, X, PartyPopper } from "lucide-react";
import { zipSync } from "fflate";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/tiff": ".tiff",
};

function getExtFromContentType(contentType: string | null): string {
  if (!contentType) return ".png";
  const mime = contentType.split(";")[0]?.trim() ?? "";
  return MIME_TO_EXT[mime] ?? ".png";
}
import { AssetCard } from "@/components/assets/asset-card";
import type { Asset } from "@/components/assets/asset-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAssetsPage, refreshAssets } from "@/actions/assets";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useIsMobile";

interface AssetsClientProps {
  initialAssets: Asset[];
  initialTotal: number;
  initialHasMore: boolean;
}

export function AssetsClient({
  initialAssets,
  initialTotal,
  initialHasMore,
}: AssetsClientProps) {
  const [userAssets, setUserAssets] = useState<Asset[]>(initialAssets);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextPage, setNextPage] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [batchIds, setBatchIds] = useState<string[] | null>(null);
  const isMobile = useIsMobile();

  // Filter assets by search and category
  const filterAssets = useCallback(
    (assets: Asset[]) => {
      if (!searchQuery.trim()) return assets;
      const q = searchQuery.toLowerCase();
      return assets.filter((a) => a.name?.toLowerCase().includes(q));
    },
    [searchQuery]
  );

  const furniture = filterAssets(userAssets.filter((a) => a.category === "FURNITURE"));
  const commerce = filterAssets(userAssets.filter((a) => a.category === "COMMERCE_PRODUCT"));
  const avatars = filterAssets(userAssets.filter((a) => a.category === "AVATAR"));
  const allFiltered = filterAssets(userAssets);

  // Read pending batch from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("pendingBatch");
    if (stored) {
      const { ids } = JSON.parse(stored) as { ids: string[] };
      setBatchIds(ids);
    }
  }, []);

  // Track loaded count in a ref so the polling callback always sees the latest value
  const loadedCountRef = useRef(initialAssets.length);
  useEffect(() => {
    loadedCountRef.current = userAssets.length;
  }, [userAssets.length]);

  // Smart polling: only runs while any loaded asset is PROCESSING
  useEffect(() => {
    const isProcessing = userAssets.some((a) => a.status === "PROCESSING");
    if (!isProcessing) return;

    const interval = setInterval(() => {
      void (async () => {
        const result = await refreshAssets(loadedCountRef.current);
        if (result.success && result.assets) {
          setUserAssets(result.assets as unknown as Asset[]);
        }
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [userAssets]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const result = await getAssetsPage(nextPage);
      if (result.success && result.assets) {
        setUserAssets((prev) => [...prev, ...(result.assets as unknown as Asset[])]);
        setTotal(result.total);
        setHasMore(result.hasMore);
        setNextPage((p) => p + 1);
      } else {
        toast.error("Failed to load more assets");
      }
    } catch {
      toast.error("Failed to load more assets");
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPage]);

  const handleAssetDeleted = useCallback((id: string) => {
    setUserAssets((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => t - 1);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleAssetRenamed = useCallback((id: string, name: string) => {
    setUserAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name } : a))
    );
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const currentTabAssets =
      activeTab === "all"
        ? allFiltered
        : activeTab === "FURNITURE"
        ? furniture
        : activeTab === "COMMERCE_PRODUCT"
        ? commerce
        : avatars;

    const completedIds = currentTabAssets
      .filter((a) => a.status === "COMPLETED")
      .map((a) => a.id);

    setSelectedIds(new Set(completedIds));
  }, [activeTab, allFiltered, furniture, commerce, avatars]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const currentTabAssets =
    activeTab === "all"
      ? allFiltered
      : activeTab === "FURNITURE"
      ? furniture
      : activeTab === "COMMERCE_PRODUCT"
      ? commerce
      : avatars;
  const completedCount = currentTabAssets.filter((a) => a.status === "COMPLETED").length;
  const allCompleted = completedCount > 0 && selectedIds.size === completedCount;

  const handleExitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const batchAssets = useMemo(
    () =>
      batchIds
        ? userAssets.filter((a) => batchIds.includes(a.id) && a.status === "COMPLETED" && a.cleanUrl)
        : [],
    [batchIds, userAssets]
  );
  const batchPending = batchIds
    ? userAssets.filter((a) => batchIds.includes(a.id) && a.status === "PROCESSING").length
    : 0;
  const batchTotal = batchIds?.length ?? 0;
  const showBatchBanner = batchIds !== null && (batchAssets.length > 0 || batchPending > 0 || batchTotal > 0);

  const dismissBatch = useCallback(() => {
    setBatchIds(null);
    localStorage.removeItem("pendingBatch");
  }, []);

  const handleBatchDownload = useCallback(async () => {
    if (batchAssets.length === 0) return;

    if (batchAssets.length === 1) {
      const asset = batchAssets[0]!;
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
      } catch {
        toast.error(`Failed to download ${asset.name ?? asset.id}`);
      }
      dismissBatch();
      return;
    }

    toast.info(`Preparing ZIP of ${batchAssets.length} files...`);
    try {
      const entries: Record<string, Uint8Array> = {};
      const nameCount: Record<string, number> = {};

      await Promise.all(
        batchAssets.map(async (asset) => {
          const response = await fetch(asset.cleanUrl!);
          const buffer = await response.arrayBuffer();
          const ext = getExtFromContentType(response.headers.get("content-type"));
          const baseName = asset.name ?? `asset-${asset.id}`;
          nameCount[baseName] = (nameCount[baseName] ?? 0) + 1;
          const suffix = nameCount[baseName] > 1 ? `-${nameCount[baseName]}` : "";
          entries[`${baseName}${suffix}${ext}`] = new Uint8Array(buffer);
        })
      );

      const zipped = zipSync(entries);
      const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assets.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to create ZIP archive");
    }
    dismissBatch();
  }, [batchAssets, dismissBatch]);

  const handleDownload = useCallback(async () => {
    const toDownload = userAssets.filter(
      (a) => selectedIds.has(a.id) && a.status === "COMPLETED" && a.cleanUrl
    );

    if (toDownload.length === 0) {
      toast.error("No completed assets selected.");
      return;
    }

    if (toDownload.length === 1) {
      const asset = toDownload[0]!;
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
      } catch {
        toast.error(`Failed to download ${asset.name ?? asset.id}`);
      }
      handleExitSelectMode();
      return;
    }

    toast.info(`Preparing ZIP of ${toDownload.length} files...`);
    try {
      const entries: Record<string, Uint8Array> = {};
      const nameCount: Record<string, number> = {};

      await Promise.all(
        toDownload.map(async (asset) => {
          const response = await fetch(asset.cleanUrl!);
          const buffer = await response.arrayBuffer();
          const ext = getExtFromContentType(response.headers.get("content-type"));
          const baseName = asset.name ?? `asset-${asset.id}`;
          nameCount[baseName] = (nameCount[baseName] ?? 0) + 1;
          const suffix = nameCount[baseName] > 1 ? `-${nameCount[baseName]}` : "";
          entries[`${baseName}${suffix}${ext}`] = new Uint8Array(buffer);
        })
      );

      const zipped = zipSync(entries);
      const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assets.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to create ZIP archive");
    }

    handleExitSelectMode();
  }, [userAssets, selectedIds, handleExitSelectMode]);

  const renderGrid = (assets: Asset[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          isSelectMode={isSelectMode}
          isSelected={selectedIds.has(asset.id)}
          onToggleSelect={handleToggleSelect}
          onDeleted={handleAssetDeleted}
          onRenamed={handleAssetRenamed}
        />
      ))}
    </div>
  );

  const loadMoreButton = hasMore && (
    <div className="flex justify-center pt-6">
      <Button
        variant="outline"
        onClick={handleLoadMore}
        disabled={isLoadingMore}
        className="rounded-xl px-6"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          `Load more (${total - userAssets.length} remaining)`
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 bg-background pt-4 pb-4 md:pt-1 md:pb-3 -mx-6 px-6 -mt-6 before:absolute before:content-[''] before:-inset-x-6 before:top-[-24px] before:h-6 before:bg-background border-b border-border/40 md:border-b-0">
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
                onClick={allCompleted ? handleDeselectAll : handleSelectAll}
                className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              >
                <CheckSquare className={`size-4 mr-2 ${allCompleted ? "fill-current" : ""}`} />
                {allCompleted ? "Deselect All" : `Select All (${completedCount})`}
              </Button>
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

      {/* Batch Download Banner */}
      {showBatchBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            {batchAssets.length > 0 ? (
              <>
                <PartyPopper className="size-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  {batchPending > 0
                    ? `${batchAssets.length} ready · ${batchPending} still processing`
                    : `All ${batchTotal} generation${batchTotal !== 1 ? "s" : ""} ready to download`}
                </p>
              </>
            ) : (
              <>
                <Loader2 className="size-4 text-primary animate-spin shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Processing {batchPending} asset{batchPending !== 1 ? "s" : ""}...
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {batchAssets.length > 0 && (
              <Button size="sm" onClick={handleBatchDownload} className="rounded-lg gap-1.5">
                <Download className="size-3.5" />
                Download {batchPending === 0 ? "All" : `(${batchAssets.length})`}
              </Button>
            )}
            <button onClick={dismissBatch} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Tabs / Select */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full sm:w-[220px] rounded-xl border border-border bg-card/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="FURNITURE">Furniture</SelectItem>
                <SelectItem value="COMMERCE_PRODUCT">Commerce</SelectItem>
                <SelectItem value="AVATAR">Avatars</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="bg-muted/50 p-1 rounded-xl w-fit">
              <TabsTrigger value="all" className="rounded-lg px-4">All Assets</TabsTrigger>
              <TabsTrigger value="FURNITURE" className="rounded-lg px-4">Furniture</TabsTrigger>
              <TabsTrigger value="COMMERCE_PRODUCT" className="rounded-lg px-4">Commerce</TabsTrigger>
              <TabsTrigger value="AVATAR" className="rounded-lg px-4">Avatars</TabsTrigger>
            </TabsList>
          )}

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-[280px] rounded-xl border border-border bg-card/50 pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">
          {renderGrid(allFiltered)}
          {!searchQuery && loadMoreButton}
        </TabsContent>
        <TabsContent value="FURNITURE" className="mt-0 outline-none">
          {renderGrid(furniture)}
          {!searchQuery && loadMoreButton}
        </TabsContent>
        <TabsContent value="COMMERCE_PRODUCT" className="mt-0 outline-none">
          {renderGrid(commerce)}
          {!searchQuery && loadMoreButton}
        </TabsContent>
        <TabsContent value="AVATAR" className="mt-0 outline-none">
          {renderGrid(avatars)}
          {!searchQuery && loadMoreButton}
        </TabsContent>
      </Tabs>

      {/* Hidden preload hint for page count */}
      <p className="sr-only">{userAssets.length} of {total} assets loaded</p>
    </div>
  );
}

