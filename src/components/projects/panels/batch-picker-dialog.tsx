"use client";

import { useEffect, useRef, useState } from "react";
import { getCompletedAssets } from "@/actions/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, CheckCircle2, ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@prisma/client";
import type { PickedImage } from "./asset-picker-dialog";

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  FURNITURE: "Furniture",
  COMMERCE_PRODUCT: "Product",
  AVATAR: "Avatar",
  MENS_WATCH: "Men's Watch",
  WOMENS_WATCH: "Women's Watch",
};

type AssetOption = {
  id: string;
  name: string | null;
  category: AssetCategory;
  cleanUrl: string | null;
  originalUrl: string;
};

function toThumbnail(url: string): string {
  if (!url.includes("ik.imagekit.io")) return url;
  return url.replace(
    /(https:\/\/ik\.imagekit\.io\/[^/]+\/)/,
    "$1tr:w-200,h-200,fo-auto/",
  );
}

type UploadAuthResponse = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
};

type ImageKitUploadResponse = {
  url: string;
  name: string;
};

interface BatchPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (images: PickedImage[]) => void;
  maxSelect?: number;
}

export function BatchPickerDialog({
  open,
  onClose,
  onSelect,
  maxSelect = 15,
}: BatchPickerDialogProps) {
  // ── Assets tab state ──────────────────────────────────────────────────────
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<AssetCategory | null>(null);

  // ── Upload tab state ──────────────────────────────────────────────────────
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setActiveFilter(null);
      setUploadFiles([]);
      // Revoke all blob preview URLs to avoid memory leaks
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPreviewUrls([]);
      setUploadProgress(0);
      return;
    }

    const load = async () => {
      setLoading(true);
      const result = await getCompletedAssets();
      if (result.success) setAssets(result.assets);
      setLoading(false);
    };
    void load();
  // previewUrls intentionally excluded — cleanup runs on open toggle only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableCategories = [...new Set(assets.map((a) => a.category))] as AssetCategory[];
  const filteredAssets = activeFilter ? assets.filter((a) => a.category === activeFilter) : assets;

  // ── Asset tab helpers ────────────────────────────────────────────────────
  const toggleSelect = (assetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else if (next.size < maxSelect) {
        next.add(assetId);
      }
      return next;
    });
  };

  const handleConfirmAssets = () => {
    const picks: PickedImage[] = assets
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        imageUrl: a.cleanUrl ?? a.originalUrl,
        imageName: a.name ?? undefined,
        category: a.category,
        source: "asset" as const,
      }));
    onSelect(picks);
  };

  // ── Upload tab helpers ────────────────────────────────────────────────────
  const handleFilesSelected = (files: FileList) => {
    const fileArray = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, maxSelect);

    // Revoke old previews before creating new ones
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = fileArray.map((f) => URL.createObjectURL(f));

    setUploadFiles(fileArray);
    setPreviewUrls(urls);
    setUploadProgress(0);
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    const results: PickedImage[] = [];

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      if (!file) continue;

      try {
        const authRes = await fetch("/api/upload-auth");
        const auth = (await authRes.json()) as UploadAuthResponse;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name);
        formData.append("token", auth.token);
        formData.append("signature", auth.signature);
        formData.append("expire", String(auth.expire));
        formData.append("publicKey", auth.publicKey);
        formData.append("folder", "/assets/references");

        const uploadRes = await fetch(
          "https://upload.imagekit.io/api/v1/files/upload",
          { method: "POST", body: formData },
        );
        const uploadData = (await uploadRes.json()) as ImageKitUploadResponse;
        results.push({
          imageUrl: uploadData.url,
          imageName: uploadData.name,
          source: "upload" as const,
        });
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
      }

      setUploadProgress(i + 1);
    }

    setUploading(false);
    if (results.length > 0) onSelect(results);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Select Batch Images
            <span className="text-sm font-normal text-muted-foreground ml-2">
              up to {maxSelect} image{maxSelect !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="assets" className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="assets" className="flex-1">
              My Assets{selected.size > 0 ? ` (${selected.size} selected)` : ""}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              Local Photos
            </TabsTrigger>
          </TabsList>

          {/* ── My Assets tab — multi-select grid ──────────────────────────── */}
          <TabsContent value="assets" className="mt-3">
            {loading ? (
              <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No completed assets yet. Upload and process some images first.
              </div>
            ) : (
              <>
                {!loading && availableCategories.length > 1 && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                      {filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""}
                      {activeFilter ? ` · ${CATEGORY_LABELS[activeFilter]}` : ""}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
                            activeFilter
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                          )}
                        >
                          <ListFilter className="h-3.5 w-3.5" />
                          {activeFilter ? CATEGORY_LABELS[activeFilter] : "Filter"}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuRadioGroup
                          value={activeFilter ?? "all"}
                          onValueChange={(v) =>
                            setActiveFilter(v === "all" ? null : (v as AssetCategory))
                          }
                        >
                          <DropdownMenuRadioItem value="all">All categories</DropdownMenuRadioItem>
                          <DropdownMenuSeparator />
                          {availableCategories.map((cat) => (
                            <DropdownMenuRadioItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredAssets.map((asset) => {
                    const isSelected = selected.has(asset.id);
                    const isDisabled = !isSelected && selected.size >= maxSelect;
                    return (
                      <button
                        key={asset.id}
                        disabled={isDisabled}
                        className={cn(
                          "group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                          isSelected
                            ? "border-primary ring-1 ring-primary"
                            : "border-border hover:border-primary/50",
                          isDisabled && "opacity-40 cursor-not-allowed",
                        )}
                        onClick={() => !isDisabled && toggleSelect(asset.id)}
                      >
                        <div className="aspect-square bg-muted">
                          <img
                            src={toThumbnail(asset.cleanUrl ?? asset.originalUrl)}
                            alt={asset.name ?? "Asset"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Selected checkmark overlay */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-1">
                          <Badge
                            variant="secondary"
                            className="text-[9px] py-0 px-1"
                          >
                            {CATEGORY_LABELS[asset.category]}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selected.size === 0
                      ? "Click images to select them"
                      : `${selected.size} of ${maxSelect} selected`}
                  </p>
                  <Button
                    size="sm"
                    disabled={selected.size === 0}
                    onClick={handleConfirmAssets}
                  >
                    Add {selected.size > 0 ? selected.size : ""} Image
                    {selected.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Local Photos tab — multi-file upload ────────────────────────── */}
          <TabsContent value="upload" className="mt-3">
            {uploadFiles.length > 0 ? (
              <div className="space-y-3">
                {/* File list with per-file progress */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {uploadFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border"
                    >
                      <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                        {previewUrls[i] && (
                          <img
                            src={previewUrls[i]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {file.name}
                      </span>
                      {/* Per-file upload status */}
                      {uploading && uploadProgress > i ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : uploading && uploadProgress === i ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                  ))}
                </div>

                {uploading && (
                  <p className="text-xs text-muted-foreground text-center">
                    Uploading {uploadProgress} / {uploadFiles.length}…
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => {
                      previewUrls.forEach((u) => URL.revokeObjectURL(u));
                      setUploadFiles([]);
                      setPreviewUrls([]);
                      setUploadProgress(0);
                    }}
                  >
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => void handleUploadAll()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      `Upload ${uploadFiles.length} Photo${uploadFiles.length !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Drop zone
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length > 0) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
              >
                <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-60" />
                <p className="text-sm font-medium">Drop photos here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse — select up to {maxSelect} at once
                </p>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  JPG, PNG, WebP supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
