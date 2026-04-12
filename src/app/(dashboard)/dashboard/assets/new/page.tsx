"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import Image from "next/image";
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
import useDrivePicker from "react-google-drive-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AssetCategory = "FURNITURE" | "COMMERCE_PRODUCT" | "AVATAR";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const categories: { id: AssetCategory; label: string; icon: IconComponent; description: string }[] = [
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
  const [uploadStep, setUploadStep] = useState<"IDLE" | "UPLOADING" | "COMPLETE">("IDLE");
  const [isDragging, setIsDragging] = useState(false);

  const [openPicker, authResponse] = useDrivePicker();
  const authResponseRef = useRef(authResponse);

  useEffect(() => {
    authResponseRef.current = authResponse;
  }, [authResponse]);

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

  const handleDrivePicker = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID;

    if (!clientId || !apiKey || !appId) {
      toast.error("Google Drive API keys are missing in .env");
      return;
    }

    openPicker({
      clientId: clientId,
      developerKey: apiKey,
      appId: appId,
      viewId: "DOCS",
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: true,
      callbackFunction: async (data: { action: string; docs?: { id: string; name: string; mimeType: string; }[] }) => {
        if (data.action === "picked" && data.docs) {
          setUploadStep("UPLOADING");
          const loadToast = toast.loading("Downloading files from Google Drive...");
          
          try {
             // Try to get token from state or gapi
             interface GapiWindow {
               gapi?: {
                 client?: { getToken?: () => { access_token?: string } };
                 auth?: { getToken?: () => { access_token?: string } };
               };
             }
             const gapiWindow = window as GapiWindow;
             const token =
               authResponseRef.current?.access_token ??
               gapiWindow.gapi?.client?.getToken?.()?.access_token ??
               gapiWindow.gapi?.auth?.getToken?.()?.access_token;
             if (!token) throw new Error("Could not authenticate with Google Drive");

             const downloadedFiles = await Promise.all(
               data.docs.map(async (doc: { id: string; name: string; mimeType: string; }) => {
                 const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
                   headers: { Authorization: `Bearer ${token}` }
                 });
                 if (!res.ok) throw new Error(`Failed to fetch ${doc.name}`);
                 const blob = await res.blob();
                 const sanitizedName = doc.name.replace(/\.[^/.]+$/, "");
                 return new File([blob], `${sanitizedName}.jpg`, { type: doc.mimeType });
               })
             );
             
             handleFiles(downloadedFiles);
             toast.dismiss(loadToast);
             toast.success(`Successfully imported ${downloadedFiles.length} file(s)`);
          } catch (e) {
             console.error("Drive import error:", e);
             toast.dismiss(loadToast);
             toast.error("Failed to import from Google Drive");
          } finally {
             setUploadStep("IDLE");
          }
        }
      },
    });
  };

  const handleUpload = async () => {
    if (!selectedCategory || files.length === 0) return;

    setUploadStep("UPLOADING");

    try {
      type AuthData = {
        token: string;
        expire: number;
        signature: string;
        publicKey: string;
        urlEndpoint: string;
      };

      const uploadPromises = files.map(async (file) => {
        const authRes = await fetch("/api/upload-auth");
        if (!authRes.ok) throw new Error(`Auth failed for file ${file.name}`);
        const authData = (await authRes.json()) as AuthData;

        return await upload({
          file,
          fileName: file.name,
          folder: "/assets/originals",
          publicKey: authData.publicKey,
          signature: authData.signature,
          token: authData.token,
          expire: authData.expire,
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
        let errorMessage = "Server upload failed";
        try {
          const errorData = (await res.json()) as { error?: string };
          errorMessage = errorData.error ?? errorMessage;
        } catch {
          // It might be an HTML error page from Next.js (e.g. 500 error)
        }
        throw new Error(errorMessage);
      }

      const data = (await res.json()) as { assetIds: string[] };
      localStorage.setItem("pendingBatch", JSON.stringify({ ids: data.assetIds }));

      setUploadStep("COMPLETE");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setUploadStep("IDLE");
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
                <h2 className="text-xl font-semibold text-foreground">Select Source & Upload</h2>
              </div>

              {/* Source Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className="group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-primary bg-primary/5 ring-4 ring-primary/10 transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/20 mb-4">
                    <Upload className="size-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">Local Files</p>
                    <p className="text-sm text-muted-foreground">Upload from your computer</p>
                  </div>
                  <div className="absolute top-4 right-4 text-primary animate-in zoom-in duration-300">
                    <CheckCircle2 className="size-5 fill-primary text-white" />
                  </div>
                </div>

                <button
                  type="button"
                  className="group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-border bg-card/40 hover:border-[#4285F4]/50 hover:bg-[#4285F4]/5 transition-all duration-300 backdrop-blur-sm"
                  onClick={handleDrivePicker}
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-[#4285F4]/10 mb-4 group-hover:bg-[#4285F4]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="size-7 fill-[#4285F4]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.532 5.034l4.51 7.823-4.51 7.822h-9l4.51-7.822zM21.522 17.856l-4.507 2.822-4.483-7.822 4.507-7.821 4.483 7.821zM11.66 3.655l4.507 7.822-4.507 7.822-4.507-7.822z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground group-hover:text-[#4285F4] transition-colors">Google Drive</p>
                    <p className="text-sm text-muted-foreground">Select from your Drive</p>
                  </div>
                </button>
              </div>

              {/* Upload Zone (For Local Selection) */}
              <div
                className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-card/80 backdrop-blur-sm"
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
                <div className="flex flex-col items-center gap-3 cursor-pointer">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Upload className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or WebP (Max 10 images)
                    </p>
                  </div>
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
                      <Image
                        src={src}
                        alt={`Preview ${String(i + 1)}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
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
                disabled={files.length === 0 || uploadStep !== "IDLE"}
                className="rounded-xl px-8 h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {uploadStep !== "IDLE" ? (
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

      <Dialog open={uploadStep !== "IDLE"} onOpenChange={(open) => {
        if (!open && uploadStep === "UPLOADING") return;
        if (!open && uploadStep === "COMPLETE") {
          setUploadStep("IDLE");
          router.push("/dashboard/assets");
          router.refresh();
        }
      }}>
        <DialogContent className="sm:max-w-md [&>button]:hidden outline-none">
          <DialogHeader className="flex flex-col items-center justify-center space-y-4 pt-6 outline-none">
            {uploadStep === "UPLOADING" ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
                <DialogTitle className="text-xl">Uploading Files...</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Please keep this window open while we securely upload your {files.length ? files.length : ''} asset{files.length !== 1 ? 's' : ''}.
                </DialogDescription>
              </>
            ) : uploadStep === "COMPLETE" ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 mb-2">
                  <CheckCircle2 className="size-8 text-green-500" />
                </div>
                <DialogTitle className="text-xl">Upload Complete!</DialogTitle>
                <DialogDescription className="text-center text-base">
                  Images are processing, you may now leave this window.
                </DialogDescription>
              </>
            ) : null}
          </DialogHeader>
          {uploadStep === "COMPLETE" && (
            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => {
                  setUploadStep("IDLE");
                  router.push("/dashboard/assets");
                  router.refresh();
                }}
                className="min-w-[120px] rounded-xl mb-4"
              >
                OK
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
