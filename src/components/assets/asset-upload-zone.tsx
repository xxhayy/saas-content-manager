"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { upload } from "@imagekit/next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AssetCategory = "FURNITURE" | "COMMERCE_PRODUCT" | "AVATAR";

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function AssetUploadZone({ onUploadComplete }: UploadZoneProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AssetCategory | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cachedAuth, setCachedAuth] = useState<{
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
    urlEndpoint: string;
  } | null>(null);

  // Pre-fetch auth params when dialog opens to eliminate latency
  const preFetchAuth = useCallback(async () => {
    try {
      const authRes = await fetch("/api/upload-auth");
      if (!authRes.ok) return;
      const data = (await authRes.json()) as {
        token: string;
        expire: number;
        signature: string;
        publicKey: string;
        urlEndpoint: string;
      };
      setCachedAuth(data);
    } catch (error) {
       console.error("Pre-fetch error:", error);
    }
  }, []);


  const handleFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    const total = files.length + imageFiles.length;

    if (total > 10) {
      toast.error("Maximum 10 images per upload");
      return;
    }

    const newPreviews = imageFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...imageFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [files.length]);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]!);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetState = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setCategory("");
    setIsUploading(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleUpload = async () => {
    if (!category || files.length === 0) return;

    setIsUploading(true);

    try {
      // Step 1: Pre-fetch or refresh auth for the first file
      let firstAuthData = cachedAuth;
      const now = Math.floor(Date.now() / 1000);

      if (!firstAuthData || firstAuthData.expire < now + 60) {
        const authRes = await fetch("/api/upload-auth");
        if (!authRes.ok) throw new Error("Failed to authenticate with ImageKit");
        firstAuthData = (await authRes.json()) as typeof cachedAuth & { urlEndpoint: string };
        setCachedAuth(firstAuthData);
      }

      // Step 2: Upload each image to ImageKit with a UNIQUE token
      const uploadPromises = files.map(async (file, index) => {
        // For the first file, use the pre-fetched / cached auth
        // For subsequent files, fetch a fresh token to avoid 'token used before' error
        let currentAuthData = index === 0 ? firstAuthData : null;

        if (index > 0) {
          const authRes = await fetch("/api/upload-auth");
          if (!authRes.ok) throw new Error(`Auth failed for file ${index + 1}`);
          currentAuthData = (await authRes.json()) as typeof cachedAuth & { urlEndpoint: string };
        }

        if (!currentAuthData) throw new Error("Auth data lost during upload");

        const result = await upload({
          file,
          fileName: file.name,
          folder: "/assets/originals",
          publicKey: currentAuthData.publicKey,
          signature: currentAuthData.signature,
          token: currentAuthData.token,
          expire: currentAuthData.expire,
        });

        return result.url;
      });




      const originalUrls = await Promise.all(uploadPromises);

      // Step 3: Send to our backend to start processing
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrls, category }),
      });

           if (!res.ok) {
        // Parse the exact error from the backend route
        const errorData = (await res.json()) as { error?: string };
        throw new Error(`Server Error: ${errorData.error ?? "Unknown error"} (Status: ${res.status})`);
      }



      toast.success(`${files.length} asset(s) submitted for processing!`);
      resetState();
      setOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
            void preFetchAuth();
        } else {
            resetState();
        }
      }}
    >

      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Assets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload New Assets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as AssetCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FURNITURE">Furniture</SelectItem>
                <SelectItem value="COMMERCE_PRODUCT">Commerce Product</SelectItem>
                <SelectItem value="AVATAR">Avatar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drop Zone */}
          <div
            className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = "image/*";
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) handleFiles(Array.from(target.files));
              };
              input.click();
            }}
          >
            <UploadCloud className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop images here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Max 10 images · JPG, PNG, WebP
            </p>
          </div>

          {/* Preview Thumbnails */}
          {previews.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {previews.map((src, i) => (
                <div
                  key={src}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={src}
                      alt={`Preview ${String(i + 1)}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <Button
            className="w-full"
            disabled={!category || files.length === 0 || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} image${files.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
