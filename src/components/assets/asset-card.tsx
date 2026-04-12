"use client";

import Image from "next/image";
import {
  Loader2,
  AlertCircle,
  Download,
  Trash,
  Armchair,
  ShoppingBag,
  UserCircle,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import React, { useState } from "react";
import type { ComponentType, SVGProps } from "react";

// Using the exact types coming from our Prisma schema
type AssetsStatus = "PROCESSING" | "COMPLETED" | "FAILED";
type AssetCategory = "FURNITURE" | "COMMERCE_PRODUCT" | "AVATAR";

export interface Asset {
  createdAt: string | number | Date;
  id: string;
  name: string | null;
  category: AssetCategory;
  originalUrl: string;
  cleanUrl: string | null;
  status: AssetsStatus;
  retryCount: number;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const categoryIcons: Record<AssetCategory, IconComponent> = {
  FURNITURE: Armchair,
  COMMERCE_PRODUCT: ShoppingBag,
  AVATAR: UserCircle,
};

interface AssetCardProps {
  asset: Asset;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onDeleted?: (id: string) => void;
  onRenamed?: (id: string, name: string) => void;
}

function AssetCardInner({
  asset,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onDeleted,
  onRenamed,
}: AssetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(asset.name ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isProcessing = asset.status === "PROCESSING";
  const isFailed = asset.status === "FAILED";
  const isCompleted = asset.status === "COMPLETED";

  // Only completed assets are selectable
  const isSelectable = isSelectMode && isCompleted;

  const Icon = categoryIcons[asset.category];

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || newName === asset.name) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Failed to rename asset");

      toast.success("Asset renamed");
      setIsEditing(false);
      onRenamed?.(asset.id, newName);
    } catch {
      toast.error("Error renaming asset");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete asset");

      toast.success("Asset deleted");
      onDeleted?.(asset.id);
    } catch {
      toast.error("Error deleting asset");
    }
  };

  const handleCardClick = () => {
    if (isSelectMode) {
      if (isSelectable) onToggleSelect?.(asset.id);
      return;
    }
    // Open dialog when clicking the image in normal mode
    if (isCompleted) {
      setIsDialogOpen(true);
    }
  };

  const handleDownload = async () => {
    if (!asset.cleanUrl) return;
    try {
      const response = await fetch(asset.cleanUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.name ?? "asset";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to download ${asset.name ?? asset.id}`);
    }
  };

  // Pick the image to show. If clean is ready, show it. Otherwise show the blurry original.
  const displayImage = asset.cleanUrl ?? asset.originalUrl;

  return (
    <>
    <div
      onClick={handleCardClick}
      className={[
        "group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-sm",
        // Select mode cursor
        isSelectMode
          ? isSelectable
            ? "cursor-pointer"
            : "cursor-not-allowed opacity-50"
          : isCompleted ? "cursor-pointer" : "",
        // Selected background highlight
        isSelected
          ? "border-primary bg-primary/15 ring-2 ring-primary/40 shadow-lg shadow-primary/10"
          : "border-border bg-card/40 hover:bg-card/80 hover:border-border/80",
      ].join(" ")}
    >
      {/* Image Container */}
      <div className="aspect-4/3 relative overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={asset.name ?? "Processing Asset"}
          fill
          className={`object-cover transition-all duration-500 ${
            isSelectMode ? "" : "group-hover:scale-110"
          } ${
            isProcessing ? "opacity-30 blur-sm scale-105 animate-pulse-subtle" : ""
          } ${isFailed ? "grayscale opacity-50" : ""} ${
            isSelected ? "scale-105" : ""
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />


        {/* Processing/Failed Overlays */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-[10px] font-bold text-foreground tracking-widest uppercase animate-pulse">
              AI Processing
            </span>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 bg-destructive/10 flex flex-col items-center justify-center z-0">
            <AlertCircle className="w-8 h-8 text-destructive mb-2" />
            <span className="text-xs font-semibold text-destructive text-center px-4">
              Processing Failed
            </span>
          </div>
        )}

        {/* Category Badge — hidden on mobile */}
        <div className="absolute top-3 left-3 hidden md:block">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white uppercase tracking-wider">
            <Icon className="size-3" />
            {asset.category.replace("_", " ")}
          </div>
        </div>

        {/* Selected checkmark badge */}
        {isSelected && (
          <div className="absolute top-3 right-3 z-30 flex items-center justify-center size-5 rounded-full bg-primary shadow-md animate-in zoom-in duration-150">
            <svg className="size-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Content — hidden on mobile */}
      <div className="hidden md:block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Suppress rename click when in select mode */}
            {isEditing && !isSelectMode ? (
              <form onSubmit={(e) => { void handleRename(e); }}>
                <Input
                  autoFocus
                  disabled={isUpdating}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  className="h-7 text-xs px-2 py-0 border-primary focus:ring-1 focus:ring-primary rounded-md"
                />
              </form>
            ) : asset.name ? (
              <h3
                className={`text-sm font-medium text-foreground truncate transition-colors ${
                  isSelectMode ? "" : "group-hover:text-primary cursor-pointer"
                }`}
                title={isSelectMode ? undefined : "Click to rename"}
                onClick={(e) => {
                  if (isSelectMode) return;
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {asset.name}
              </h3>
            ) : (
              <Skeleton className="h-5 w-3/4 bg-muted-foreground/20" />
            )}
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">
              {new Date(asset.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* 3-dot menu — hidden in select mode */}
          {!isSelectMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {isCompleted && asset.cleanUrl && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload();
                    }}
                  >
                    <Download className="size-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="size-4 mr-2" />
                  {isCompleted && "Delete"}
                  {isFailed && "Delete Failed"}
                  {isProcessing && "Cancel & Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0" showCloseButton={true}>
        <DialogTitle className="sr-only">View {asset.name ?? "asset"}</DialogTitle>
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted rounded-t-xl">
          <Image
            src={displayImage}
            alt={asset.name ?? "Asset"}
            width={800}
            height={600}
            className="w-full h-full object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 90vw"
          />
        </div>
        <DialogFooter className="mx-0 mb-0 gap-3 bg-muted/30 p-4 flex-row justify-between items-center">
          <Button
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setIsDialogOpen(false);
              void handleDelete();
            }}
            className="gap-2"
          >
            <Trash className="size-4" />
            Delete
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Close
            </Button>
            {isCompleted && asset.cleanUrl && (
              <Button onClick={handleDownload} className="gap-2">
                <Download className="size-4" />
                Download
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export const AssetCard = React.memo(AssetCardInner);
