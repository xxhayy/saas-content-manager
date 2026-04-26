"use client";

import { useState, useEffect } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
  useEdges,
} from "@xyflow/react";
import { MapPin, Eye, CheckCircle2, X, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SpatialScene } from "@/lib/spatial-scenes";
import { SpatialScenePickerDialog } from "@/components/projects/panels/spatial-scene-picker-dialog";
import { SpatialViewDialog } from "@/components/projects/panels/spatial-view-dialog";
import { useProjectContext } from "@/components/projects/project-context";
import { refreshGenerations } from "@/actions/projects";

// ─── Pixel heights — must match the Tailwind classes used in JSX exactly ──────
// h-10 = 40px  →  header row
// h-28 = 112px →  scene thumbnail preview
// h-9  = 36px  →  each slot row
const HEADER_H = 40;
const PREVIEW_H = 112;
const SLOT_H = 36;

const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;

export type SpatialNodeData = {
  sceneId?: string;
  scene?: SpatialScene;
  // slotConnections: built reactively from canvas edges (element.id → imageUrl)
  slotConnections: Record<string, string>;
  // directSlotPicks: set directly from the View dialog asset picker (element.id → imageUrl)
  // These are merged with slotConnections at generate time — edge connections win on conflict
  directSlotPicks: Record<string, string>;
  aspectRatio: string;
  variationCount: number;
};

export type SpatialNodeType = Node<SpatialNodeData, "spatial">;

export function SpatialNode({
  id,
  data,
  selected,
  positionAbsoluteX, // used in handleGenerate (Task 8) to place the Output Node
  positionAbsoluteY,
}: NodeProps<SpatialNodeType>) {
  const [scenePickerOpen, setScenePickerOpen] = useState(!data.sceneId);
  const [viewOpen, setViewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { updateNodeData, deleteElements, getNode, addNodes, addEdges } = useReactFlow();
  const edges = useEdges();
  const { projectId, onGenerationsUpdate } = useProjectContext();

  // ── Reactive slotConnections from canvas edges ─────────────────────────────
  // Mirrors the same pattern used in template-node.tsx.
  // Loops all edges targeting this node with a "slot-" prefixed handle,
  // reads the source Reference Node's imageUrl, and rebuilds the map.
  // Only calls updateNodeData when something actually changed to avoid loops.
  useEffect(() => {
    if (!data.scene) return;

    const newSlotConnections: Record<string, string> = {};

    edges.forEach((e) => {
      if (e.target === id && e.targetHandle?.startsWith("slot-")) {
        const elementId = e.targetHandle.slice("slot-".length);
        const sourceNode = getNode(e.source);
        const imageUrl = (sourceNode?.data as { imageUrl?: string })?.imageUrl;
        if (imageUrl) {
          newSlotConnections[elementId] = imageUrl;
        }
      }
    });

    if (
      JSON.stringify(newSlotConnections) !== JSON.stringify(data.slotConnections)
    ) {
      updateNodeData(id, { slotConnections: newSlotConnections });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, id, data.scene, getNode, updateNodeData]);

  // ── Effective connections: merge directSlotPicks + edge slotConnections ─────
  // Edge-based connections take precedence over dialog-picked direct values.
  const effectiveConnections: Record<string, string> = {
    ...(data.directSlotPicks ?? {}),
    ...(data.slotConnections ?? {}),
  };

  const filledCount = Object.keys(effectiveConnections).length;
  const totalSlots = data.scene?.elements.length ?? 0;

  const update = (patch: Partial<SpatialNodeData>) => updateNodeData(id, patch);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!data.sceneId || !data.scene) {
      alert("Select a scene before generating.");
      return;
    }

    if (filledCount === 0) {
      alert("Fill at least one slot before generating.");
      return;
    }

    setGenerating(true);
    try {
      // ── Find or create the Output Node ──────────────────────────────────
      // Reuse an existing Output Node wired from this Spatial Node's right
      // handle. If none exists, create one to the right of this node.
      const existingOutputEdge = edges.find(
        (e) => e.source === id && getNode(e.target)?.type === "output",
      );

      let outputNodeId: string;

      if (existingOutputEdge) {
        outputNodeId = existingOutputEdge.target;
      } else {
        outputNodeId = `output-spatial-${Date.now()}`;
        addNodes([
          {
            id: outputNodeId,
            type: "output",
            position: {
              x: positionAbsoluteX + 320,
              y: positionAbsoluteY,
            },
            data: { generationIds: [] },
          },
        ]);
        addEdges([
          {
            id: `edge-${id}-${outputNodeId}`,
            source: id,
            target: outputNodeId,
            type: "custom",
          },
        ]);
      }

      // ── POST to generate API ─────────────────────────────────────────────
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "spatial",
          sceneId: data.sceneId,
          effectiveConnections,          // merged directSlotPicks + slotConnections
          aspectRatio: data.aspectRatio ?? "1:1",
          model: "nano-banana-2",
          variationCount: Math.min(Math.max(data.variationCount ?? 1, 1), 4),
          outputNodeId,
        }),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        alert(`Generation failed: ${err.error ?? "Unknown error"}`);
        return;
      }

      const { generationIds } = (await response.json()) as {
        generationIds: string[];
      };

      // ── Seed the Output Node and start the polling loop ──────────────────
      // updateNodeData gives the Output Node its generation IDs immediately
      // so it can render spinners while kie.ai processes in the background.
      updateNodeData(outputNodeId, { generationIds });

      const result = await refreshGenerations(projectId);
      if (result.success) onGenerationsUpdate(result.generations);

    } catch (err) {
      console.error("[SpatialNode] Generate error:", err);
      alert("Something went wrong. Check the console for details.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    // overflow: visible required — slot handle dots extend past the card's left edge
    <div className="relative" style={{ overflow: "visible" }}>

      {/* ── Visible card ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "w-64 rounded-xl border bg-card shadow-sm transition-shadow group",
          selected
            ? "border-primary shadow-md shadow-primary/20"
            : "border-border",
        )}
      >
        {/* ── Header — h-10 = 40px — must match HEADER_H ─────────────────── */}
        <div className="h-10 flex items-center gap-1.5 px-2 border-b border-border">

          {/* Eye / View button — top-left, opens the interactive spatial map */}
          <button
            className={cn(
              "nodrag flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              !data.sceneId && "opacity-40 cursor-not-allowed",
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (data.sceneId) setViewOpen(true);
            }}
            title={data.sceneId ? "View scene map" : "Select a scene first"}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Spatial
          </span>

          {/* Category badge */}
          {data.scene && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 truncate max-w-20">
              {data.scene.category}
            </span>
          )}

          {/* Delete button */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-1 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              void deleteElements({ nodes: [{ id }] });
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* ── Scene thumbnail — h-28 = 112px — must match PREVIEW_H ──────── */}
        {data.scene ? (
          <div
            className="h-28 relative overflow-hidden cursor-pointer"
            onClick={() => setScenePickerOpen(true)}
          >
            <img
              src={data.scene.thumbnailUrl}
              alt={data.scene.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0";
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-2">
              <p className="text-white text-xs font-medium">{data.scene.name}</p>
            </div>
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 text-white text-[10px] font-medium bg-black/60 px-2 py-1 rounded transition-opacity">
                Change scene
              </span>
            </div>
          </div>
        ) : (
          /* Empty state — shown before a scene is selected */
          <button
            className="w-full h-28 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            onClick={() => setScenePickerOpen(true)}
          >
            <MapPin className="h-8 w-8 opacity-40" />
            <span className="text-xs">Click to select scene</span>
          </button>
        )}

        {/* ── Slot rows — each h-9 = 36px — must match SLOT_H ────────────── */}
        {data.scene?.elements.map((element) => {
          const isFilled = !!effectiveConnections[element.id];
          return (
            <div
              key={element.id}
              className="h-9 flex items-center gap-2 px-3 border-t border-border"
            >
              {/* Colored status indicator — matches element.color from the annotated image */}
              {isFilled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <div
                  className="h-3 w-3 rounded-full border-2 shrink-0"
                  style={{ borderColor: element.color }}
                />
              )}
              <span className="text-xs truncate flex-1">{element.label}</span>
            </div>
          );
        })}

        {/* ── Bottom controls section ──────────────────────────────────────── */}
        <div className="p-3 space-y-2.5 border-t border-border">

          {/* Slot fill status hint */}
          {data.scene && (
            <p className="text-[10px] text-muted-foreground">
              {filledCount === 0
                ? "Connect references to slots or use View to pick"
                : `${filledCount} of ${totalSlots} slot${totalSlots !== 1 ? "s" : ""} filled`}
            </p>
          )}

          {/* Aspect ratio + variations */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Aspect Ratio</Label>
              <Select
                value={data.aspectRatio ?? "1:1"}
                onValueChange={(v) => update({ aspectRatio: v })}
              >
                <SelectTrigger className="nodrag h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Variations</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={data.variationCount ?? 1}
                onChange={(e) =>
                  update({ variationCount: parseInt(e.target.value) || 1 })
                }
                className="nodrag h-7 text-xs"
              />
            </div>
          </div>

          {/* Generate button */}
          <Button
            size="sm"
            className="nodrag w-full"
            disabled={generating || !data.sceneId || filledCount === 0}
            onClick={() => void handleGenerate()}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* ── Slot input handles — one per scene element ──────────────────────
          Rendered as siblings to the card (not inside it) so they sit outside
          the card's border without being clipped.
          top = HEADER_H + PREVIEW_H + (index × SLOT_H) + (SLOT_H / 2)
          This centers each handle dot on its slot row's vertical midpoint.
          The handle id "slot-{element.id}" is what the editor's onConnectStart
          reads to detect a drag originating from a spatial slot. */}
      {data.scene?.elements.map((element, i) => (
        <Handle
          key={element.id}
          type="target"
          position={Position.Left}
          id={`slot-${element.id}`}
          style={{
            top: HEADER_H + PREVIEW_H + SLOT_H * i + SLOT_H / 2,
            left: -6,
            // Subtle colored ring on each handle to match the annotated image color
            borderColor: element.color,
          }}
          className="w-3! h-3! bg-card! border-2!"
        />
      ))}

      {/* ── Output handle — RIGHT side → to Output Node ─────────────────── */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3! h-3! bg-primary! border-2! border-background!"
      />

      {/* ── Scene picker dialog ──────────────────────────────────────────── */}
      <SpatialScenePickerDialog
        open={scenePickerOpen}
        onClose={() => setScenePickerOpen(false)}
        onSelect={(scene) => {
          updateNodeData(id, {
            sceneId: scene.id,
            scene,
            slotConnections: {},
            directSlotPicks: {},
          });
          setScenePickerOpen(false);
        }}
      />

      {/* ── View dialog — interactive spatial map with pin buttons ─────── */}
      {data.scene && (
        <SpatialViewDialog
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          scene={data.scene}
          effectiveConnections={effectiveConnections}
          onSlotSelect={(elementId, imageUrl, imageName) => {
            updateNodeData(id, {
              directSlotPicks: {
                ...(data.directSlotPicks ?? {}),
                [elementId]: imageUrl,
              },
            });
            void imageName; // consumed by reference node label in future
          }}
          onSlotClear={(elementId) => {
            const updated = { ...(data.directSlotPicks ?? {}) };
            delete updated[elementId];
            updateNodeData(id, { directSlotPicks: updated });
          }}
        />
      )}
    </div>
  );
}
