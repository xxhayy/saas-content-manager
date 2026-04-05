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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import React, { useState } from "react";

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

const categoryIcons: Record<AssetCategory, any> = {
  FURNITURE: Armchair,
  COMMERCE_PRODUCT: ShoppingBag,
  AVATAR: UserCircle,
};

export function AssetCard({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(asset.name ?? "");
  const [isUpdating, setIsUpdating] = useState(false);

  const isProcessing = asset.status === "PROCESSING";
  const isFailed = asset.status === "FAILED";
  const isCompleted = asset.status === "COMPLETED";

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
      router.refresh();
    } catch (error) {
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
      router.refresh();
    } catch (error) {
      toast.error("Error deleting asset");
    }
  };

  const canDelete = isCompleted || isFailed;

  // Pick the image to show. If clean is ready, show it. Otherwise show the blurry original.
  const displayImage = asset.cleanUrl ?? asset.originalUrl;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card/40 hover:bg-card/80 hover:border-border/80 transition-all duration-300 overflow-hidden backdrop-blur-sm">
      {/* Image Container */}
      <div className="aspect-4/3 relative overflow-hidden bg-muted">
        <Image
          src={displayImage}
          alt={asset.name ?? "Processing Asset"}
          fill
          className={`object-cover transition-all duration-500 group-hover:scale-110 ${
            isProcessing ? "opacity-30 blur-sm scale-105 animate-pulse-subtle" : ""
          } ${isFailed ? "grayscale opacity-50" : ""}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />

        {/* Hover Overlay */}
        {canDelete && (
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 z-20">
            <div className="flex gap-2 w-full">
              {isCompleted && (
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md cursor-pointer"
                  onClick={() => window.open(asset.cleanUrl!, "_blank")}
                >
                  <Download className="size-4 mr-2" />
                  Download
                </Button>
              )}
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleDelete}
                className={`${isCompleted ? "bg-white/10" : "flex-1 bg-destructive/20 hover:bg-destructive/40"} hover:bg-white/20 text-white border-0 backdrop-blur-md px-2 cursor-pointer transition-colors`}
              >
                <Trash className="size-4 mr-2" />
                {isFailed && "Delete Failed Asset"}
              </Button>
            </div>
          </div>
        )}

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

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white uppercase tracking-wider">
            <Icon className="size-3" />
            {asset.category.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form onSubmit={handleRename}>
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
                className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors cursor-pointer" 
                title="Click to rename"
                onClick={() => setIsEditing(true)}
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
        </div>
      </div>
    </div>
  );
}
