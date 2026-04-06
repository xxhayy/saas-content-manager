"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Upload, 
  Armchair, 
  ShoppingBag, 
  UserCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  X
} from "lucide-react";
import { upload } from "@imagekit/next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type AssetCategory = "FURNITURE" | "COMMERCE_PRODUCT" | "AVATAR";

const categories: { id: AssetCategory; label: string; icon: any; description: string }[] = [
  { 
    id: "FURNITURE", 
    label: "Furniture", 
    icon: Armchair, 
    description: "3D models, textures, or specs for chairs, desks, sofas, etc." 
  },
  { 
    id: "COMMERCE_PRODUCT", 
    label: "Commerce Product", 
    icon: ShoppingBag, 
    description: "Product shots, mockups, or listing assets for retail items." 
  },
  { 
    id: "AVATAR", 
    label: "Avatar", 
    icon: UserCircle, 
    description: "Profile photos, character renders, or representative icons." 
  },
];

export default function NewAssetPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
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

  // Pre-fetch auth params to eliminate latency
  useEffect(() => {
    const preFetchAuth = async () => {
      try {
        const authRes = await fetch("/api/upload-auth");
        if (!authRes.ok) return;
        const data = await authRes.json();
        setCachedAuth(data);
      } catch (error) {
        console.error("Pre-fetch error:", error);
      }
    };
    void preFetchAuth();
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

  const handleUpload = async () => {
    if (!selectedCategory || files.length === 0) return;

    setIsUploading(true);

    try {
      let firstAuthData = cachedAuth;
      const now = Math.floor(Date.now() / 1000);

      if (!firstAuthData || firstAuthData.expire < now + 60) {
        const authRes = await fetch("/api/upload-auth");
        if (!authRes.ok) throw new Error("Failed to authenticate with ImageKit");
        firstAuthData = await authRes.json();
        setCachedAuth(firstAuthData);
      }

      const uploadPromises = files.map(async (file, index) => {
        let currentAuthData = index === 0 ? firstAuthData : null;

        if (index > 0) {
          const authRes = await fetch("/api/upload-auth");
          if (!authRes.ok) throw new Error(`Auth failed for file ${index + 1}`);
          currentAuthData = await authRes.json();
        }

        if (!currentAuthData) throw new Error("Auth data lost during upload");

        return await upload({
          file,
          fileName: file.name,
          folder: "/assets/originals",
          publicKey: currentAuthData.publicKey,
          signature: currentAuthData.signature,
          token: currentAuthData.token,
          expire: currentAuthData.expire,
        });
      });

      const results = await Promise.all(uploadPromises);
      const originalUrls = results.map(r => r.url);

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrls, category: selectedCategory }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Server upload failed");
      }

      toast.success(`${files.length} asset(s) submitted for processing!`);
      router.push("/dashboard/assets");
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Back Link */}
      <Link
        href="/dashboard/assets"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        Back to Assets
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Asset</h1>
        <p className="text-muted-foreground text-lg">
          Add high-quality assets to your creative library for AI processing.
        </p>
      </div>

      <div className="space-y-10">
        {/* Step 1: Choose Category */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">1</div>
            <h2 className="text-xl font-semibold text-foreground">Choose Asset Category</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`relative flex flex-col items-start p-5 rounded-2xl border-2 text-left transition-all duration-300 group ${
                    isSelected 
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                      : "border-border bg-card/40 hover:border-border/80 hover:bg-accent/20 backdrop-blur-sm"
                  }`}
                >
                  <div className={`p-3 rounded-xl mb-4 transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
                  }`}>
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cat.description}
                  </p>
                  {isSelected && (
                    <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-300">
                      <CheckCircle2 className="size-5 fill-primary text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {selectedCategory && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <Separator className="opacity-50" />

            {/* Step 2: Source Method & Upload */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">2</div>
                <h2 className="text-xl font-semibold text-foreground">Upload Assets</h2>
              </div>

              {/* Upload Zone */}
              <div
                className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-border bg-card/40 hover:border-primary/50 hover:bg-card/80 backdrop-blur-sm"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { 
                    e.preventDefault(); 
                    setIsDragging(false); 
                    handleFiles(Array.from(e.dataTransfer.files));
                }}
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
                <div className="flex flex-col items-center gap-4 cursor-pointer">
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <Upload className="size-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG, or WebP (Max 10 images)
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="mt-2 rounded-xl">
                    Select Files
                  </Button>
                </div>
              </div>

              {/* Preview Thumbnails */}
              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
                  {previews.map((src, i) => (
                    <div
                      key={src}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted"
                    >
                      <img
                        src={src}
                        alt={`Preview ${String(i + 1)}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100 shadow-md"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator className="opacity-50" />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Link href="/dashboard/assets">
                <Button variant="ghost" className="rounded-xl px-6">Cancel</Button>
              </Link>
              <Button 
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="rounded-xl px-8 h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {isUploading ? (
                    <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Uploading...
                    </>
                ) : (
                    <>
                        Process {files.length} Asset{files.length !== 1 ? 's' : ''}
                        <ChevronRight className="size-4 ml-2" />
                    </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!selectedCategory && (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20 backdrop-blur-sm animate-pulse-subtle">
            <p className="text-muted-foreground">Select a category above to continue with asset details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
