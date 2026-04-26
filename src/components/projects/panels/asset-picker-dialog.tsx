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
import { UploadCloud, Loader2, ListFilter, Library } from "lucide-react";
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
import { getLibraryAssets, type LibraryAsset } from "@/lib/app-asset-library";

// Unified return type — covers both asset picks and local uploads.
// Reference Node uses this instead of the raw AssetOption shape.
export type PickedImage = {
  imageUrl: string;
  imageName?: string;
  category?: AssetCategory;
  source: "asset" | "upload";
};

type AssetOption = {
  id: string;
  name: string | null;
  category: AssetCategory;
  cleanUrl: string | null;
  originalUrl: string;
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  FURNITURE: "Furniture",
  COMMERCE_PRODUCT: "Product",
  AVATAR: "Avatar",
  MENS_WATCH: "Men's Watch",
  WOMENS_WATCH: "Women's Watch",
};

interface AssetPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (image: PickedImage) => void;
  filterCategory?: AssetCategory;
  hideUpload?: boolean;
}

// Inserts ImageKit's transformation segment into the URL so the browser
// downloads a 200×200 thumbnail instead of the full-resolution image.
// Format: https://ik.imagekit.io/id/tr:w-200,h-200,fo-auto/path/to/file.jpg
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

export function AssetPickerDialog({
  open,
  onClose,
  onSelect,
  filterCategory,
  hideUpload = false,
}: AssetPickerDialogProps) {
  // ── Assets tab state ──────────────────────────────────────────────────────
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AssetCategory | null>(null);

  // ── Upload tab state ──────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // Reset all state when dialog closes
      setUploadFile(null);
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
      setUploadPreview(null);
      setActiveFilter(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      const result = await getCompletedAssets();
      if (result.success) setAssets(result.assets);
      setLoading(false);
    };

    void load();
  // uploadPreview intentionally excluded — only re-run on open toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    // Create a temporary local blob URL for the preview.
    // This is replaced with the real ImageKit URL after upload.
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    try {
      // Step 1: get fresh auth credentials from our server
      const authRes = await fetch("/api/upload-auth");
      const auth = (await authRes.json()) as UploadAuthResponse;

      // Step 2: upload directly to ImageKit from the browser
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("fileName", uploadFile.name);
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

      onSelect({
        imageUrl: uploadData.url,
        imageName: uploadData.name,
        source: "upload",
      });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  // Categories present in the loaded assets — drives the filter pill list.
  const availableCategories = [
    ...new Set(assets.map((a) => a.category)),
  ] as AssetCategory[];

  // Prop-level filterCategory locks to a single category (template slot mode).
  // activeFilter is the interactive filter the user picks inside the dialog.
  const filtered = assets.filter((a) => {
    if (filterCategory && a.category !== filterCategory) return false;
    if (activeFilter && a.category !== activeFilter) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="assets" className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="assets" className="flex-1">
              My Assets
            </TabsTrigger>
            {!hideUpload && (
              <TabsTrigger value="upload" className="flex-1">
                Local Photo
              </TabsTrigger>
            )}
            <TabsTrigger value="library" className="flex-1">
              App Library
            </TabsTrigger>
          </TabsList>

          {/* ── My Assets tab ─────────────────────────────────────────────── */}
          <TabsContent value="assets" className="mt-3">
            {/* Category filter button — hidden when locked by the filterCategory
                prop (template slot mode) or when only one category exists */}
            {!filterCategory && !loading && availableCategories.length > 1 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
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
                      <DropdownMenuRadioItem value="all">
                        All categories
                      </DropdownMenuRadioItem>
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

            {loading ? (
              <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {filterCategory
                  ? `No ${CATEGORY_LABELS[filterCategory]} assets found.`
                  : "No completed assets yet. Upload and process some images first."}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {filtered.map((asset) => (
                  <button
                    key={asset.id}
                    className={cn(
                      "group relative rounded-lg overflow-hidden border border-border",
                      "hover:border-primary transition-colors cursor-pointer",
                    )}
                    onClick={() =>
                      onSelect({
                        imageUrl: asset.cleanUrl ?? asset.originalUrl,
                        imageName: asset.name ?? undefined,
                        category: asset.category,
                        source: "asset",
                      })
                    }
                  >
                    {/* toThumbnail() requests a 200×200 crop from ImageKit
                        instead of loading the full-resolution image */}
                    <div className="aspect-square bg-muted">
                      <img
                        src={toThumbnail(asset.cleanUrl ?? asset.originalUrl)}
                        alt={asset.name ?? "Asset"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5">
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {CATEGORY_LABELS[asset.category]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Local Photo tab ────────────────────────────────────────────── */}
          <TabsContent value="upload" className="mt-3">
            {uploadPreview ? (
              // Preview + confirm state
              <div className="space-y-3">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                  <img
                    src={uploadPreview}
                    alt="Upload preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center truncate">
                  {uploadFile?.name}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => {
                      setUploadFile(null);
                      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
                      setUploadPreview(null);
                    }}
                  >
                    Choose different
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={uploading}
                    onClick={() => void handleUpload()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Use this photo"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Drop zone state
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
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
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    handleFileSelect(file);
                  }
                }}
              >
                <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-60" />
                <p className="text-sm font-medium">Drop a photo here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse your files
                </p>
                <p className="text-xs text-muted-foreground/60 mt-3">
                  JPG, PNG, WebP supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            )}
          </TabsContent>
          {/* ── App Library tab ───────────────────────────────────────────── */}
          <TabsContent value="library" className="mt-3">
            <AppLibraryTab
              filterCategory={filterCategory}
              onSelect={onSelect}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── App Library tab ────────────────────────────────────────────────────────────
// Separated into its own component so the library list is computed once on
// render rather than on every keystroke or state change in the parent dialog.
function AppLibraryTab({
  filterCategory,
  onSelect,
}: {
  filterCategory?: AssetCategory;
  onSelect: (image: PickedImage) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<AssetCategory | null>(null);

  // getLibraryAssets is synchronous — no loading state needed
  const allLibraryAssets: LibraryAsset[] = getLibraryAssets(filterCategory);

  const filtered = activeFilter
    ? allLibraryAssets.filter((a) => a.category === activeFilter)
    : allLibraryAssets;

  // Derive the unique categories present in the (possibly pre-filtered) list
  const availableCategories = [
    ...new Set(allLibraryAssets.map((a) => a.category)),
  ] as AssetCategory[];

  return (
    <div>
      {/* Category filter — hidden when locked by the filterCategory prop */}
      {!filterCategory && availableCategories.length > 1 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5" />
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
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
                <DropdownMenuRadioItem value="all">
                  All categories
                </DropdownMenuRadioItem>
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

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {filterCategory
            ? `No ${CATEGORY_LABELS[filterCategory]} assets in the library yet.`
            : "No library assets available."}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              className={cn(
                "group relative rounded-lg overflow-hidden border border-border",
                "hover:border-primary transition-colors cursor-pointer",
              )}
              onClick={() =>
                onSelect({
                  imageUrl: asset.imageUrl,
                  imageName: asset.name,
                  category: asset.category,
                  source: "asset",
                })
              }
            >
              <div className="aspect-square bg-muted">
                <img
                  src={toThumbnail(asset.imageUrl)}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Gracefully hide broken images — library URLs are placeholders
                    // until real assets are uploaded to ImageKit
                    (e.target as HTMLImageElement).style.opacity = "0.15";
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <Badge variant="secondary" className="text-[10px] py-0">
                  {CATEGORY_LABELS[asset.category]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
