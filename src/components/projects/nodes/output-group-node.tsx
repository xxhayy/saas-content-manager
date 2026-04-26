"use client";

import { useState } from "react";
import { type NodeProps, type Node, useReactFlow, useNodes, Handle, Position } from "@xyflow/react";
import { Download, FolderDown } from "lucide-react";
import { zipSync } from "fflate";
import { useProjectContext } from "@/components/projects/project-context";
import { cn } from "@/lib/utils";
import type { OutputNodeData } from "./output-node";

export type OutputGroupNodeData = {
  label: string;
  outputNodeIds: string[];
};

export type OutputGroupNodeType = Node<OutputGroupNodeData, "output-group">;

export function OutputGroupNode({
  id,
  data,
  selected,
}: NodeProps<OutputGroupNodeType>) {
  const { generations } = useProjectContext();
  const { updateNodeData } = useReactFlow();
  const nodes = useNodes();
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label);

  const allGenerationIds = data.outputNodeIds.flatMap((nid) => {
    const node = nodes.find((n) => n.id === nid);
    return (node?.data as OutputNodeData | undefined)?.generationIds ?? [];
  });

  const completedImages = generations.filter(
    (g) => allGenerationIds.includes(g.id) && g.status === "COMPLETED" && g.imageUrl,
  );

  const handleSaveAll = async () => {
    if (completedImages.length === 0) return;

    const entries: Record<string, Uint8Array> = {};
    await Promise.all(
      completedImages.map(async (gen, i) => {
        const res = await fetch(gen.imageUrl!);
        const buf = await res.arrayBuffer();
        entries[`${data.label}-${i + 1}.jpg`] = new Uint8Array(buf);
      }),
    );
    const zipped = zipSync(entries);
    const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.label}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const commitLabel = () => {
    updateNodeData(id, { label: labelDraft.trim() || "Batch Output" });
    setEditing(false);
  };

  return (
    <div className="relative" style={{ overflow: "visible" }}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3! h-3! bg-card! border-2! border-primary!"
      />

      <div
        className={cn(
          "w-56 rounded-xl border bg-card shadow-sm transition-shadow",
          selected ? "border-primary shadow-md shadow-primary/20" : "border-border",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
          <FolderDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          {editing ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => e.key === "Enter" && commitLabel()}
              className="nodrag flex-1 bg-transparent text-xs outline-none border-b border-primary text-foreground"
            />
          ) : (
            <span
              className="flex-1 text-xs font-medium text-foreground truncate cursor-text hover:text-primary transition-colors"
              onClick={() => setEditing(true)}
              title="Click to rename"
            >
              {data.label}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {completedImages.length} ready · {data.outputNodeIds.length} output{data.outputNodeIds.length !== 1 ? "s" : ""}
          </span>
          <button
            disabled={completedImages.length === 0}
            onClick={handleSaveAll}
            className={cn(
              "nodrag flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors",
              completedImages.length > 0
                ? "border-primary text-primary hover:bg-primary/10"
                : "border-border text-muted-foreground opacity-40 cursor-not-allowed",
            )}
            title="Download all as ZIP"
          >
            <Download className="h-3 w-3" />
            Save All
          </button>
        </div>
      </div>
    </div>
  );
}
