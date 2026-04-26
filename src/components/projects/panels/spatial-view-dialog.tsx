"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpatialScene } from "@/lib/spatial-scenes";
import {
  AssetPickerDialog,
  type PickedImage,
} from "@/components/projects/panels/asset-picker-dialog";

interface SpatialViewDialogProps {
  open: boolean;
  onClose: () => void;
  scene: SpatialScene;
  // Merged result of directSlotPicks + edge slotConnections — what the node
  // computed as effectiveConnections. Read-only here; updates go via callbacks.
  effectiveConnections: Record<string, string>; // element.id → imageUrl
  onSlotSelect: (elementId: string, imageUrl: string, imageName?: string) => void;
  onSlotClear: (elementId: string) => void;
}

export function SpatialViewDialog({
  open,
  onClose,
  scene,
  effectiveConnections,
  onSlotSelect,
  onSlotClear,
}: SpatialViewDialogProps) {
  // Tracks which element's slot picker is currently open. Only one at a time.
  const [activePinElementId, setActivePinElementId] = useState<string | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              {scene.name}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">
                — click a pin to assign a reference
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* ── Interactive scene map ──────────────────────────────────────────
              The image fills the full dialog width. The overlay sits exactly
              on top of it (absolute inset-0) so pin positions as % coordinates
              map 1:1 to the image's pixel coordinates. */}
          <div className="relative w-full select-none">
            <img
              src={scene.thumbnailUrl}
              alt={scene.name}
              className="w-full h-auto block"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.2";
              }}
            />

            {/* Pin overlay — sits exactly over the image */}
            <div className="absolute inset-0">
              {scene.elements.map((element) => {
                const imageUrl = effectiveConnections[element.id];
                const isFilled = !!imageUrl;

                return (
                  <div
                    key={element.id}
                    className="absolute group/pin"
                    style={{
                      left: `${element.pinPosition.x}%`,
                      top: `${element.pinPosition.y}%`,
                      transform: "translate(-50%, -50%)",
                      // Lift pins above the overlay so hovers are never blocked
                      zIndex: 10,
                    }}
                  >
                    {isFilled ? (
                      // ── Filled pin — circular thumbnail ──────────────────
                      <div className="relative" style={{ width: 44, height: 44 }}>
                        <button
                          className="w-full h-full rounded-full overflow-hidden transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{
                            border: `2.5px solid ${element.color}`,
                            boxShadow: `0 0 0 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)`,
                          }}
                          title={`${element.label} — click to change`}
                          onClick={() => setActivePinElementId(element.id)}
                        >
                          <img
                            src={imageUrl}
                            alt={element.label}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        {/* Remove button — appears in the top-right corner on hover */}
                        <button
                          className={cn(
                            "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full",
                            "bg-destructive flex items-center justify-center",
                            "opacity-0 group-hover/pin:opacity-100 transition-opacity",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "shadow-md",
                          )}
                          title={`Remove ${element.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClear(element.id);
                          }}
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      // ── Empty pin — circle with + icon ───────────────────
                      <button
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center",
                          "transition-transform hover:scale-110 active:scale-95",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                        style={{
                          border: `2.5px solid ${element.color}`,
                          background: "rgba(255, 255, 255, 0.92)",
                          backdropFilter: "blur(6px)",
                          boxShadow: `0 0 0 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)`,
                        }}
                        title={`Add ${element.label}`}
                        onClick={() => setActivePinElementId(element.id)}
                      >
                        <Plus
                          className="h-4 w-4"
                          style={{ color: element.color }}
                        />
                      </button>
                    )}

                    {/* Label tooltip — slides up on hover */}
                    <span
                      className={cn(
                        "absolute top-full mt-2 left-1/2 -translate-x-1/2",
                        "text-[10px] font-medium text-white",
                        "bg-black/75 px-2 py-0.5 rounded-full whitespace-nowrap",
                        "backdrop-blur-sm pointer-events-none",
                        "opacity-0 group-hover/pin:opacity-100 transition-opacity",
                      )}
                    >
                      {element.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Slot status legend ─────────────────────────────────────────────
              Compact row below the image showing each slot's fill state.
              Gives a quick overview without having to inspect every pin. */}
          <div className="px-5 py-3 border-t border-border flex flex-wrap gap-2">
            {scene.elements.map((element) => {
              const isFilled = !!effectiveConnections[element.id];
              return (
                <button
                  key={element.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors",
                    isFilled
                      ? "border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                  onClick={() => setActivePinElementId(element.id)}
                  title={isFilled ? `Change ${element.label}` : `Add ${element.label}`}
                >
                  {isFilled ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: element.color }}
                    />
                  )}
                  {element.label}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Asset picker for the active pin ─────────────────────────────────────
          Rendered outside the view Dialog so the two Radix portals don't nest.
          Only mounts when a pin has been clicked. Closing it returns to the
          view dialog without closing it. */}
      {activePinElementId && (
        <AssetPickerDialog
          open={!!activePinElementId}
          onClose={() => setActivePinElementId(null)}
          hideUpload
          onSelect={(picked: PickedImage) => {
            onSlotSelect(activePinElementId, picked.imageUrl, picked.imageName);
            setActivePinElementId(null);
          }}
        />
      )}
    </>
  );
}
