"use client";

import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import { Loader2, ImageIcon, ArrowRight, AlertCircle, Download } from "lucide-react";
import { zipSync } from "fflate";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/components/projects/project-context";
import { cn } from "@/lib/utils";

export type OutputNodeData = {
  generationIds: string[];
};

export type OutputNodeType = Node<OutputNodeData, "output">;

export function OutputNode({
  data,
  selected,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<OutputNodeType>) {
  const { generations } = useProjectContext();
  const { addNodes, addEdges } = useReactFlow();

  const myGenerations = generations.filter((g) =>
    data.generationIds.includes(g.id),
  );

  const completedImages = myGenerations.filter(
    (g) => g.status === "COMPLETED" && g.imageUrl,
  );

  const handleSave = async () => {
    if (completedImages.length === 0) return;

    if (completedImages.length === 1) {
      const a = document.createElement("a");
      a.href = completedImages[0]!.imageUrl!;
      a.download = `generation-${completedImages[0]!.id}.jpg`;
      a.target = "_blank";
      a.click();
      return;
    }

    const entries: Record<string, Uint8Array> = {};
    await Promise.all(
      completedImages.map(async (gen, i) => {
        const res = await fetch(gen.imageUrl!);
        const buf = await res.arrayBuffer();
        entries[`generation-${i + 1}.jpg`] = new Uint8Array(buf);
      }),
    );
    const zipped = zipSync(entries);
    const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generations.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUseAsReference = (imageUrl: string) => {
    const timestamp = Date.now();
    const refId = `reference-${timestamp}`;
    const controlId = `control-${timestamp}`;

    addNodes([
      {
        id: refId,
        type: "reference",
        position: { x: positionAbsoluteX + 320, y: positionAbsoluteY },
        data: { imageUrl, source: "generation" },
      },
      {
        id: controlId,
        type: "control",
        position: { x: positionAbsoluteX + 520, y: positionAbsoluteY },
        data: { aspectRatio: "1:1", variationCount: 1, model: "nano-banana-2" },
        deletable: true,
      },
    ]);

    addEdges([
      {
        id: `edge-${refId}-${controlId}`,
        source: refId,
        target: controlId,
        targetHandle: "input",
        type: "custom",
      },
    ]);
  };

  return (
    // Wrapper with overflow: visible so the top Handle isn't clipped
    <div className="relative" style={{ overflow: "visible" }}>
      {/* Input on the LEFT — wire from Control Node */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3! h-3! bg-card! border-2! border-primary!"
      />
      {/* Output on the RIGHT — wire to Output Group Node */}
      <Handle
        type="source"
        position={Position.Right}
        id="group-out"
        className="w-3! h-3! bg-card! border-2! border-primary!"
      />

      <div
        className={cn(
          "w-72 rounded-xl border bg-card shadow-sm transition-shadow overflow-hidden",
          selected
            ? "border-primary shadow-md shadow-primary/20"
            : "border-border",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Output
          </span>
          {myGenerations.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {myGenerations.filter((g) => g.status === "COMPLETED").length}/
              {myGenerations.length} done
            </span>
          )}
          {completedImages.length > 0 && (
            <button
              className="nodrag ml-1 h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleSave}
              title={completedImages.length > 1 ? "Save all as ZIP" : "Save image"}
            >
              <Download className="h-3 w-3" />
            </button>
          )}
        </div>

        {myGenerations.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-40" />
            <span className="text-xs text-center px-4">
              Results appear here after you click Generate
            </span>
          </div>
        ) : (
          // Generation grid — max-h prevents unbounded growth with many results
          <div className="p-2 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {myGenerations.map((gen) => (
              <div
                key={gen.id}
                className="relative rounded-lg overflow-hidden border border-border bg-muted/20 aspect-square"
              >
                {/* PENDING / PROCESSING */}
                {(gen.status === "PENDING" || gen.status === "PROCESSING") && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {gen.status === "PENDING" ? "Queued" : "Processing"}
                    </span>
                  </div>
                )}

                {/* COMPLETED */}
                {gen.status === "COMPLETED" && gen.imageUrl && (
                  <div className="group relative w-full h-full">
                    <img
                      src={gen.imageUrl}
                      alt={`Variation ${gen.variationIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="nodrag h-6 text-[10px] px-2"
                        onClick={() =>
                          gen.imageUrl && handleUseAsReference(gen.imageUrl)
                        }
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Use as Ref
                      </Button>
                    </div>
                  </div>
                )}

                {/* FAILED */}
                {gen.status === "FAILED" && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-destructive p-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-[10px] text-center">
                      {gen.kieError ?? "Generation failed"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
