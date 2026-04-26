"use client";

import { useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
  useEdges,
} from "@xyflow/react";
import { Layers, ImageIcon, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@prisma/client";
import {
  AssetPickerDialog,
  type PickedImage,
} from "@/components/projects/panels/asset-picker-dialog";
import { BatchPickerDialog } from "@/components/projects/panels/batch-picker-dialog";

export type MultiGenNodeData = {
  centralImageUrl?: string;
  centralImageName?: string;
  centralImageCategory?: AssetCategory;
};

export type MultiGenNodeType = Node<MultiGenNodeData, "multigen">;

export function MultiGenNode({
  id,
  data,
  selected,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<MultiGenNodeType>) {
  const [centralPickerOpen, setCentralPickerOpen] = useState(false);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);

  const { updateNodeData, deleteElements, addNodes, addEdges } = useReactFlow();
  const edges = useEdges();

  // Count Reference Nodes currently wired into this MultiGen node
  const connectedRefCount = edges.filter((e) => e.target === id).length;
  const remaining = 15 - connectedRefCount;

  // When user confirms batch selection, create one Reference Node per image
  // and auto-connect each to this MultiGen node's input handle.
  const handleBatchSelect = (images: PickedImage[]) => {
    setBatchPickerOpen(false);
    if (images.length === 0) return;

    const timestamp = Date.now();

    const newNodes = images.map((image, index) => ({
      id: `reference-mg-${timestamp}-${index}`,
      type: "reference" as const,
      position: {
        x: positionAbsoluteX - 220,
        // Stack new nodes below any already-connected ones
        y: positionAbsoluteY + (connectedRefCount + index) * 64,
      },
      data: {
        imageUrl: image.imageUrl,
        imageName: image.imageName,
        category: image.category,
        source: image.source,
      },
    }));

    const newEdges = newNodes.map((node) => ({
      id: `edge-${node.id}-${id}`,
      source: node.id,
      target: id,
      targetHandle: "batch-input",
      type: "custom" as const,
    }));

    addNodes(newNodes);
    addEdges(newEdges);
  };

  const handleAddReferenceNode = () => {
    if (connectedRefCount >= 15) return;
    const newId = `reference-mg-${Date.now()}`;
    addNodes([
      {
        id: newId,
        type: "reference",
        position: {
          x: positionAbsoluteX - 220,
          y: positionAbsoluteY + connectedRefCount * 275,
        },
        data: { source: "asset" },
      },
    ]);
    addEdges([
      {
        id: `edge-${newId}-${id}`,
        source: newId,
        target: id,
        targetHandle: "batch-input",
        type: "custom",
      },
    ]);
  };

  return (
    <>
      {/* Wrapper needs overflow: visible so the left handle dot isn't clipped */}
      <div className="relative" style={{ overflow: "visible" }}>
        {/* Left handle — click to add a reference node, or drag to connect */}
        <Handle
          type="target"
          id="batch-input"
          position={Position.Left}
          onClick={connectedRefCount < 15 ? handleAddReferenceNode : undefined}
          style={{ left: -14, width: 28, height: 28 }}
          className={cn(
            "rounded-full! bg-card! border-2! border-primary! flex! items-center! justify-center!",
            connectedRefCount < 15 ? "cursor-pointer! hover:bg-primary/10!" : "cursor-not-allowed! opacity-50!",
          )}
          title={connectedRefCount < 15 ? "Click to add reference node" : "Max 15 reached"}
        >
          <Plus className="h-3.5 w-3.5 text-primary pointer-events-none" />
        </Handle>

        <div
          className={cn(
            "w-56 rounded-xl border bg-card shadow-sm transition-shadow group",
            selected
              ? "border-primary shadow-md shadow-primary/20"
              : "border-border",
          )}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                MultiGen
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {connectedRefCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/20">
                  {connectedRefCount} ref{connectedRefCount !== 1 ? "s" : ""}
                </span>
              )}
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteElements({ nodes: [{ id }] });
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ── Central Reference ────────────────────────────────────────────
              This is the constant hero image shared across all generations.
              e.g. the model wearing the watch. */}
          <div className="p-3 space-y-2 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Central Reference
            </p>
            <div
              className="relative cursor-pointer rounded-lg overflow-hidden bg-muted/20 border border-border group/central"
              style={{ aspectRatio: "16/9" }}
              onClick={() => setCentralPickerOpen(true)}
            >
              {data.centralImageUrl ? (
                <>
                  <img
                    src={data.centralImageUrl}
                    alt={data.centralImageName ?? "Central reference"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/central:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover/central:opacity-100 text-white text-xs font-medium transition-opacity bg-black/50 px-2 py-1 rounded">
                      Change
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors p-3">
                  <ImageIcon className="h-6 w-6 opacity-40" />
                  <span className="text-[10px] text-center">
                    Select central reference
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Batch Images ─────────────────────────────────────────────────
              Shows how many Reference Nodes are wired in and lets the user
              add more via the BatchPickerDialog. */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Batch Images
              </p>
              {connectedRefCount > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {connectedRefCount}/15
                </span>
              )}
            </div>

            {connectedRefCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">
                  No batch images added yet
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border p-2 bg-muted/10 text-center">
                <p className="text-xs font-medium text-foreground">
                  {connectedRefCount} image{connectedRefCount !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  connected as reference nodes
                </p>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="nodrag w-full h-7 text-xs"
              disabled={remaining <= 0}
              onClick={() => setBatchPickerOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {remaining <= 0 ? "Max 15 reached" : "Add Batch Images"}
            </Button>
          </div>

          {/* Right handle → to Control Node */}
          <Handle
            type="source"
            position={Position.Right}
            className="w-3! h-3! bg-primary! border-2! border-background!"
          />
        </div>
      </div>

      {/* Single-image picker for the central reference */}
      <AssetPickerDialog
        open={centralPickerOpen}
        onClose={() => setCentralPickerOpen(false)}
        onSelect={(image: PickedImage) => {
          updateNodeData(id, {
            centralImageUrl: image.imageUrl,
            centralImageName: image.imageName,
            centralImageCategory: image.category,
          });
          setCentralPickerOpen(false);
        }}
      />

      {/* Multi-select picker for batch images */}
      <BatchPickerDialog
        open={batchPickerOpen}
        onClose={() => setBatchPickerOpen(false)}
        onSelect={handleBatchSelect}
        maxSelect={remaining}
      />
    </>
  );
}
