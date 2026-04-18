"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  ChevronRight,
  Loader2,
  X,
  Sparkles,
  ChevronDown,
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

// ─── STYLES ────────────────────────────────────────────────────────────────
// To add a new style: add an entry here with the DB category value, a label,
// and the ImageKit URL of the preview thumbnail.
// See ADDING A NEW STYLE in the project docs for the full checklist.
const categories: { id: AssetCategory; label: string; previewUrl: string }[] = [
  {
    id: "FURNITURE",
    label: "Furniture",
    // TODO: replace with your actual ImageKit preview URL
    previewUrl: "https://ik.imagekit.io/aironestu/assets/previews/furniture-preview.jpg",
  },
  {
    id: "COMMERCE_PRODUCT",
    label: "Commerce Product",
    // TODO: replace with your actual ImageKit preview URL
    previewUrl: "https://ik.imagekit.io/aironestu/assets/previews/commerce-preview.jpg",
  },
  {
    id: "AVATAR",
    label: "Avatar",
    // TODO: replace with your actual ImageKit preview URL
    previewUrl: "https://ik.imagekit.io/aironestu/assets/previews/avatar-preview.jpg",
  },
];

export default function NewAssetPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
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

    if (total > 20) {
      toast.error("Maximum 20 images per upload");
      return;
    }

    const newPreviews = imageFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...imageFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [files.length]);

  const removeFile = (index: number) => {
    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview);
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

  const selectedStyle = categories.find((c) => c.id === selectedCategory);

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
          Add high-quality assets to your creative library.
        </p>
      </div>

      <div className="space-y-10">
        {/* Step 1: Choose Style */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">1</div>
            <h2 className="text-xl font-semibold text-foreground">Choose a Style</h2>
          </div>

          {selectedStyle ? (
            /* Selected style summary — click to reopen dialog */
            <button
              type="button"
              onClick={() => setStyleDialogOpen(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl border-2 border-primary bg-primary/5 ring-4 ring-primary/10 text-left transition-all hover:bg-primary/10 group"
            >
              <div className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-border/50 bg-muted">
                <Image
                  src={selectedStyle.previewUrl}
                  alt={selectedStyle.label}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Selected Style</p>
                <p className="font-semibold text-foreground truncate">{selectedStyle.label}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors pr-1">
                <span className="text-xs">Change</span>
                <ChevronDown className="size-4" />
              </div>
            </button>
          ) : (
            /* No style selected yet */
            <button
              type="button"
              onClick={() => setStyleDialogOpen(true)}
              className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all duration-300 group"
            >
              <Sparkles className="size-5 group-hover:text-primary transition-colors" />
              <span className="font-medium">Browse Styles</span>
              <ChevronDown className="size-4" />
            </button>
          )}
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

              {/* Source: Google Drive + Drop Zone side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Google Drive */}
                <button
                  type="button"
                  className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-border bg-card/40 hover:border-[#4285F4]/50 hover:bg-[#4285F4]/5 transition-all duration-300 backdrop-blur-sm"
                  onClick={handleDrivePicker}
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/10 group-hover:bg-[#4285F4]/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="size-7 fill-[#4285F4]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.532 5.034l4.51 7.823-4.51 7.822h-9l4.51-7.822zM21.522 17.856l-4.507 2.822-4.483-7.822 4.507-7.821 4.483 7.821zM11.66 3.655l4.507 7.822-4.507 7.822-4.507-7.822z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground group-hover:text-[#4285F4] transition-colors">Google Drive</p>
                    <p className="text-sm text-muted-foreground">Import from your Drive</p>
                  </div>
                </button>

                {/* Upload Drop Zone */}
                <div
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
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
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <Upload className="size-7 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">Local Files</p>
                    <p className="text-sm text-muted-foreground">Click or drag & drop</p>
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
                    Process {files.length} Asset{files.length !== 1 ? "s" : ""}
                    <ChevronRight className="size-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Style Picker Dialog ── */}
      <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose a Style</DialogTitle>
            <DialogDescription>
              Select the output style you want applied to your uploaded images.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 pb-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setStyleDialogOpen(false);
                  }}
                  className={`relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all duration-200 group ${
                    isSelected
                      ? "border-primary ring-4 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-muted overflow-hidden">
                    <Image
                      src={cat.previewUrl}
                      alt={`${cat.label} style preview`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10" />
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 drop-shadow">
                        <CheckCircle2 className="size-5 fill-primary text-white" />
                      </div>
                    )}
                  </div>
                  {/* Label */}
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">{cat.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Upload Progress Dialog ── */}
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
                  Please keep this window open while we securely upload your {files.length ? files.length : ""} asset{files.length !== 1 ? "s" : ""}.
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
                className="min-w-30 rounded-xl mb-4"
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
