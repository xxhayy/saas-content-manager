"use client";

import { useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import type { AssetCategory } from "@prisma/client";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetPickerDialog, type PickedImage } from "@/components/projects/panels/asset-picker-dialog";

// The shape of data this node stores.
// This gets JSON-serialized into the project's nodesJson column in the database.
export type ReferenceNodeData = {
  imageUrl?: string;
  imageName?: string;
  nodeName?: string;
  // Set when auto-created from a Spatial Node slot drag — label is locked to slot name
  slotLabel?: string;
  category?: AssetCategory;
  source?: "asset" | "upload" | "generation";
};


// This is the full React Flow node type — React Flow's Node<Data, TypeString>
// We export it so the editor client can use it when typing the nodes array.
export type ReferenceNodeType = Node<ReferenceNodeData, "reference">;

const CATEGORY_COLORS: Partial<Record<AssetCategory, string>> = {
  FURNITURE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  COMMERCE_PRODUCT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  AVATAR: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  MENS_WATCH: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  WOMENS_WATCH: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const CATEGORY_LABELS: Partial<Record<AssetCategory, string>> = {
  FURNITURE: "Furniture",
  COMMERCE_PRODUCT: "Product",
  AVATAR: "Avatar",
  MENS_WATCH: "Men's Watch",
  WOMENS_WATCH: "Women's Watch",
};

export function ReferenceNode({
  id,
  data,
  selected,
}: NodeProps<ReferenceNodeType>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // updateNodeData(nodeId, patch) — merges patch into this node's data field.
  // This is the v12 way to update node data from inside a node component.
  const { updateNodeData, deleteElements } = useReactFlow();

  return (
    <>
      <div
        className={cn(
          "w-48 rounded-xl border bg-card shadow-sm transition-shadow group",
          selected
            ? "border-primary shadow-md shadow-primary/20"
            : "border-border",
        )}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Reference
          </span>
          <div className="flex items-center gap-1.5">
            {data.category && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  CATEGORY_COLORS[data.category],
                )}
              >
                {CATEGORY_LABELS[data.category]}
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

   {/* Image area — click to open picker */}
<div
  className="aspect-square relative cursor-pointer group bg-muted/20 overflow-hidden"
  onClick={() => setPickerOpen(true)}
>
  {data.imageUrl ? (
    <>
      <img
        src={data.imageUrl}
        alt={data.imageName ?? "Reference image"}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition-opacity bg-black/50 px-2 py-1 rounded">
          Change
        </span>
      </div>
    </>
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
      <ImageIcon className="h-8 w-8 opacity-40" />
      <span className="text-xs">Select image</span>
    </div>
  )}
</div>

{/* Node name input — always visible, outside the image area so it doesn't conflict with the click-to-pick interaction */}
<div className="px-3 py-2 border-t border-border rounded-b-xl">
 <input
  value={data.nodeName ?? ""}
  onChange={(e) => updateNodeData(id, { nodeName: e.target.value })}
  onMouseDown={(e) => e.stopPropagation()}
  onClick={(e) => e.stopPropagation()}
  placeholder="Label this image…"
  className="nodrag w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 focus:text-foreground focus:outline-none"
/>

</div>

      </div>

      {/* Output handle — the dot users drag from to start a connection.
          The ! prefix on Tailwind classes overrides React Flow's default handle styles. */}
      {/* Output on the RIGHT — Reference Nodes sit to the left of the canvas,
          their wire goes right toward the Control Node */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3! h-3! bg-primary! border-2! border-background!"
      />

      {/* Asset picker — only mounts when open, fetches assets then */}
      <AssetPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        hideUpload={!!data.slotLabel}
        onSelect={(image: PickedImage) => {
          updateNodeData(id, {
            imageUrl: image.imageUrl,
            imageName: image.imageName,
            category: image.category,
            source: image.source,
          });
          setPickerOpen(false);
        }}
      />
    </>
  );
}
