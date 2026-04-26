"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSpatialScenesByCategory, type SpatialScene } from "@/lib/spatial-scenes";
import { MapPin } from "lucide-react";

interface SpatialScenePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (scene: SpatialScene) => void;
}

const CATEGORY_ORDER = ["Real Estate", "Automotive", "Showroom", "Retail"] as const;

export function SpatialScenePickerDialog({
  open,
  onClose,
  onSelect,
}: SpatialScenePickerDialogProps) {
  const grouped = getSpatialScenesByCategory();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Select a Scene
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {CATEGORY_ORDER.map((category) => {
            const scenes = grouped[category];
            if (!scenes || scenes.length === 0) return null;

            return (
              <div key={category}>
                {/* Category heading */}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {scenes.map((scene) => (
                    <button
                      key={scene.id}
                      className={cn(
                        "group relative rounded-xl overflow-hidden border border-border text-left",
                        "hover:border-primary transition-all hover:shadow-md hover:shadow-primary/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      onClick={() => onSelect(scene)}
                    >
                      {/* Scene thumbnail */}
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        <img
                          src={scene.thumbnailUrl}
                          alt={scene.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {/* Slot count badge */}
                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                            {scene.elements.length} slot{scene.elements.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Scene info */}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {scene.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {scene.description}
                        </p>

                        {/* Element color dots — visual preview of available slots */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {scene.elements.map((el) => (
                            <span
                              key={el.id}
                              className="inline-block w-2.5 h-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: el.color }}
                              title={el.label}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
