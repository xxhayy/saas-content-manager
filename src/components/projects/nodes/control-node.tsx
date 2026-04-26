"use client";
import { useProjectContext } from "@/components/projects/project-context";
import { refreshGenerations } from "@/actions/projects";
import { useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
  useReactFlow,
  useEdges,
  useNodes,
} from "@xyflow/react";
import { Settings2, Wand2, Plus, LayoutTemplate, ImageIcon, Loader2, Layers, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ControlNodeData = {
  prompt?: string;
  promptModifier?: string;
  aspectRatio: string;
  variationCount: number;
  model: string;
  seed?: number;
};

export type ControlNodeType = Node<ControlNodeData, "control">;

const ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;

export function ControlNode({
  id,
  data,
  selected,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<ControlNodeType>) {
  const { updateNodeData, getNode, addNodes, addEdges, deleteElements } = useReactFlow();
const edges = useEdges();
const nodes = useNodes();
const { projectId, onGenerationsUpdate } = useProjectContext(); // ← add this line


  // Controls the dropdown that appears when the + handle is clicked
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mode detection — checked against live edges so badges update as user connects/disconnects
  const isTemplateMode = edges.some((e) => {
    if (e.target !== id) return false;
    return getNode(e.source)?.type === "template";
  });

  const isMultiGenMode = edges.some((e) => {
    if (e.target !== id) return false;
    return getNode(e.source)?.type === "multigen";
  });

  const connectedRefImages = edges
    .filter((e) => e.target === id && getNode(e.source)?.type === "reference")
    .map((e) => (getNode(e.source)?.data as { imageUrl?: string })?.imageUrl)
    .filter(Boolean) as string[];

  const hasTemplate = edges.some(
    (e) => e.target === id && getNode(e.source)?.type === "template",
  );
  const hasMultiGen = edges.some(
    (e) => e.target === id && getNode(e.source)?.type === "multigen",
  );

  // Close dropdown when clicking outside it
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (e: Event) => {
      const target = (e as MouseEvent).target as HTMLElement;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick, { capture: true });

    const canvas = document.querySelector(".react-flow__pane");
    canvas?.addEventListener("mousedown", handleOutsideClick, { capture: true });

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, { capture: true });
      canvas?.removeEventListener("mousedown", handleOutsideClick, { capture: true });
    };
  }, [dropdownOpen]);

  // Creates a new node and immediately wires it to this Control Node (Task 4).
  // The new node is placed to the left. We stagger Reference Nodes vertically
  // so multiple references don't stack on top of each other.
  const handleAddNode = (type: "reference" | "template" | "multigen") => {
    setDropdownOpen(false);

    const existingRefs = nodes.filter((n) => n.type === "reference").length;
    const newId = `${type}-${Date.now()}`;

    let position: { x: number; y: number };
    if (type === "reference") {
      position = { x: positionAbsoluteX - 260, y: positionAbsoluteY + existingRefs * 60 };
    } else if (type === "template") {
      position = { x: positionAbsoluteX - 340, y: positionAbsoluteY - 200 };
    } else {
      position = { x: positionAbsoluteX - 300, y: positionAbsoluteY - 160 };
    }

    addNodes([
      {
        id: newId,
        type,
        position,
        data:
          type === "reference"
            ? { source: "asset" }
            : type === "template"
              ? { slotConnections: {} }
              : {},
      },
    ]);

    addEdges([
      {
        id: `edge-${newId}-${id}`,
        source: newId,
        target: id,
        targetHandle: "input",
        type: "custom",
      },
    ]);
  };

const handleGenerate = async () => {
  setGenerating(true);
  try {
    // ── Branch 1: MultiGen mode ─────────────────────────────────────────────
    if (isMultiGenMode) {
      const multiGenEdge = edges.find(
        (e) => e.target === id && getNode(e.source)?.type === "multigen",
      );
      if (!multiGenEdge) return;

      const multiGenNode = getNode(multiGenEdge.source);
      if (!multiGenNode) return;

      const mgData = multiGenNode.data as { centralImageUrl?: string };

      if (!mgData.centralImageUrl) {
        alert("Set a central reference image on the MultiGen node before generating.");
        return;
      }

      // All Reference Nodes wired into the MultiGen node
      const refEdgesOnMg = edges.filter(
        (e) =>
          e.target === multiGenNode.id &&
          getNode(e.source)?.type === "reference",
      );

      if (refEdgesOnMg.length === 0) {
        alert("Add batch images to the MultiGen node before generating.");
        return;
      }

      if (!data.prompt?.trim()) {
        alert("Add a prompt before generating.");
        return;
      }

      const variations = Math.min(Math.max(data.variationCount ?? 1, 1), 4);
      const timestamp = Date.now();

      // Create one Output Node per reference image, stacked vertically
      const outputNodeIds: string[] = [];
      const newOutputNodes: Node[] = [];
      const newOutputEdges: { id: string; source: string; target: string; type: string }[] = [];

      refEdgesOnMg.forEach((_, index) => {
        const outputId = `output-mg-${timestamp}-${index}`;
        outputNodeIds.push(outputId);
        newOutputNodes.push({
          id: outputId,
          type: "output",
          position: {
            x: positionAbsoluteX + 340,
            y: positionAbsoluteY + index * 220,
          },
          data: { generationIds: [] },
        });
        newOutputEdges.push({
          id: `edge-ctrl-${outputId}`,
          source: id,
          target: outputId,
          type: "custom",
        });
      });

      const groupId = `output-group-${timestamp}`;
      newOutputNodes.push({
        id: groupId,
        type: "output-group",
        position: {
          x: positionAbsoluteX + 340,
          y: positionAbsoluteY + refEdgesOnMg.length * 220 + 20,
        },
        data: { label: "Batch Output", outputNodeIds: outputNodeIds },
      });

      const groupEdges = outputNodeIds.map((oid) => ({
        id: `edge-${oid}-${groupId}`,
        source: oid,
        sourceHandle: "group-out",
        target: groupId,
        type: "custom",
      }));

      addNodes(newOutputNodes);
      addEdges([...newOutputEdges, ...groupEdges]);

      // Fire one API call per reference image in parallel
      const apiResults = await Promise.allSettled(
        refEdgesOnMg.map(async (refEdge, i) => {
          const currentOutputNodeId = outputNodeIds[i];
          if (!currentOutputNodeId) return;

          const refNode = getNode(refEdge.source);
          const refData = refNode?.data as
            | { imageUrl?: string; nodeName?: string }
            | undefined;
          if (!refData?.imageUrl) return;

          let finalPrompt = data.prompt ?? "";
          if (refData.nodeName) {
            finalPrompt = `Reference image labeled "${refData.nodeName}".\n\n${finalPrompt}`;
          }

          const response = await fetch(`/api/projects/${projectId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "freeform",
              prompt: finalPrompt,
              imageInputs: [mgData.centralImageUrl!, refData.imageUrl],
              aspectRatio: data.aspectRatio,
              model: data.model,
              variationCount: variations,
              seed: data.seed,
              outputNodeId: currentOutputNodeId,
            }),
          });

          if (!response.ok) {
            const err = (await response.json()) as { error?: string };
            throw new Error(err.error ?? "Unknown error");
          }

          const { generationIds } = (await response.json()) as {
            generationIds: string[];
          };
          updateNodeData(currentOutputNodeId, { generationIds });
        }),
      );

      const failures = apiResults.filter((r) => r.status === "rejected");
      if (failures.length > 0 && failures.length === apiResults.length) {
        alert("All generations failed. Check the console for details.");
      } else if (failures.length > 0) {
        alert(
          `${failures.length} of ${apiResults.length} generations failed. Others are processing.`,
        );
      }

      const result = await refreshGenerations(projectId);
      if (result.success) onGenerationsUpdate(result.generations);

    // ── Branch 2 & 3: Template mode + Freeform mode (single output node) ───
    } else {
      // Reuse existing output node if one is already wired, otherwise create one
      const existingOutputEdge = edges.find(
        (e) => e.source === id && getNode(e.target)?.type === "output",
      );

      let outputNodeId: string;
      if (existingOutputEdge) {
        outputNodeId = existingOutputEdge.target;
      } else {
        outputNodeId = `output-${Date.now()}`;
        addNodes([
          {
            id: outputNodeId,
            type: "output",
            position: { x: positionAbsoluteX + 340, y: positionAbsoluteY },
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

      let requestBody: unknown;

      if (isTemplateMode) {
        const templateEdge = edges.find(
          (e) => e.target === id && getNode(e.source)?.type === "template",
        );
        if (!templateEdge) return;

        const templateNode = getNode(templateEdge.source);
        if (!templateNode) return;

        const templateNodeData = templateNode.data as {
          templateId?: string;
          slotConnections?: Record<string, string>;
          template?: { slots: { id: string; required: boolean; label: string }[] };
        };

        if (!templateNodeData.templateId) return;

        const requiredUnfilled =
          templateNodeData.template?.slots.filter(
            (s) => s.required && !templateNodeData.slotConnections?.[s.id],
          ) ?? [];

        if (requiredUnfilled.length > 0) {
          const names = requiredUnfilled.map((s) => s.label).join(", ");
          alert(`Fill required slots before generating: ${names}`);
          return;
        }

        requestBody = {
          mode: "template",
          templateId: templateNodeData.templateId,
          slotConnections: templateNodeData.slotConnections ?? {},
          promptModifier: data.promptModifier ?? "",
          aspectRatio: data.aspectRatio,
          model: data.model,
          variationCount: Math.min(Math.max(data.variationCount ?? 1, 1), 4),
          seed: data.seed,
          outputNodeId,
        };
      } else {
        // Freeform
        const refEdges = edges.filter(
          (e) => e.target === id && getNode(e.source)?.type === "reference",
        );

        const imageInputs: string[] = [];
        const refNames: string[] = [];

        refEdges.forEach((e) => {
          const refNode = getNode(e.source);
          if (!refNode) return;
          const refData = refNode.data as { imageUrl?: string; nodeName?: string };
          if (refData.imageUrl) {
            imageInputs.push(refData.imageUrl);
            if (refData.nodeName) refNames.push(refData.nodeName);
          }
        });

        if (!data.prompt?.trim() && imageInputs.length === 0) {
          alert("Add a prompt or connect at least one reference image.");
          return;
        }

        let finalPrompt = data.prompt ?? "";
        if (refNames.length > 0) {
          finalPrompt = `You have reference images labeled: ${refNames.join(", ")}.\n\n${finalPrompt}`;
        }

        requestBody = {
          mode: "freeform",
          prompt: finalPrompt,
          imageInputs,
          aspectRatio: data.aspectRatio,
          model: data.model,
          variationCount: Math.min(Math.max(data.variationCount ?? 1, 1), 4),
          seed: data.seed,
          outputNodeId,
        };
      }

      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        alert(`Generation failed: ${err.error ?? "Unknown error"}`);
        return;
      }

      const { generationIds } = (await response.json()) as {
        generationIds: string[];
      };

      updateNodeData(outputNodeId, { generationIds });

      const result = await refreshGenerations(projectId);
      if (result.success) onGenerationsUpdate(result.generations);
    }
  } catch (err) {
    console.error("Generate error:", err);
    alert("Something went wrong. Check the console for details.");
  } finally {
    setGenerating(false);
  }
};



  const update = (patch: Partial<ControlNodeData>) => updateNodeData(id, patch);

  return (
    <div
      className={cn(
        "relative group w-72 rounded-xl border bg-card shadow-sm transition-shadow",
        selected
          ? "border-primary shadow-md shadow-primary/20"
          : "border-border",
      )}
    >
      {/* ── LEFT HANDLE — styled as a clickable + button (Tasks 1 & 2) ────────
          This is a real React Flow target Handle so users can ALSO drag from
          other nodes onto it. We override the default tiny dot appearance with
          inline styles (width/height/left) and Tailwind classes for the circle.
          The onClick opens the add-node dropdown.
          The data-add-handle attribute lets the editor's onConnectStart
          identify that the drag originated from this specific handle (Task 5). */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        data-add-handle="true"
        onClick={() => setDropdownOpen((v) => !v)}
        style={{ left: -14, width: 28, height: 28 }}
        className={cn(
          "rounded-full! bg-card! border-2! border-primary! cursor-pointer!",
          "flex! items-center! justify-center!",
          "hover:bg-primary/10! transition-colors!",
        )}
      >
        {/* The icon is pointer-events-none so clicks pass through to the Handle */}
        <Plus className="h-3.5 w-3.5 text-primary pointer-events-none" />
      </Handle>

      {/* ── ADD NODE DROPDOWN ────────────────────────────────────────────────
          Appears to the left of the + button when clicked.
          dropdownRef is used by the outside-click listener to close it. */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-200 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-44"
          style={{ left: -176, top: "50%", transform: "translateY(-50%)" }}
        >
          <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            Add node
          </p>
          <button
            className="nodrag w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
            onClick={() => handleAddNode("reference")}
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            Reference Node
          </button>
          <button
            className={cn(
              "nodrag w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left",
              hasTemplate || hasMultiGen
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-muted/50",
            )}
            onClick={() => !(hasTemplate || hasMultiGen) && handleAddNode("template")}
            title={hasTemplate ? "Already has a template" : hasMultiGen ? "Cannot add template when MultiGen is connected" : undefined}
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
            </div>
            Template Node
          </button>
          <button
            className={cn(
              "nodrag w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left",
              hasMultiGen || hasTemplate
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-muted/50",
            )}
            onClick={() => !(hasMultiGen || hasTemplate) && handleAddNode("multigen")}
            title={hasMultiGen ? "Already has a MultiGen" : hasTemplate ? "Cannot add MultiGen when template is connected" : undefined}
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-3.5 w-3.5 text-primary" />
            </div>
            MultiGen Node
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Control
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] px-1.5 py-0.5 rounded border",
            isTemplateMode
              ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
              : isMultiGenMode
                ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                : "bg-sky-500/20 text-sky-400 border-sky-500/30",
          )}
        >
          {isTemplateMode
            ? "Template mode"
            : isMultiGenMode
              ? "MultiGen mode"
              : "Freeform mode"}
        </span>
        {/* Delete button — hidden on the default (non-deletable) control node */}
        {id !== "control-default" && (
          <button
            className="nodrag ml-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
            onClick={() => deleteElements({ nodes: [{ id }] })}
            title="Delete node"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Prompt / modifier */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {isTemplateMode ? "Prompt modifier (optional)" : "Prompt"}
          </Label>
          <textarea
            value={
              isTemplateMode ? (data.promptModifier ?? "") : (data.prompt ?? "")
            }
            onChange={(e) =>
              update(
                isTemplateMode
                  ? { promptModifier: e.target.value }
                  : { prompt: e.target.value },
              )
            }
            placeholder={
              isTemplateMode
                ? "Add extra direction (optional)..."
                : "Describe the scene you want to generate..."
            }
            rows={3}
            className="nodrag w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {isMultiGenMode && (
            <p className="text-[10px] text-muted-foreground">
              One output node will be created per batch image
            </p>
          )}
          {!isTemplateMode && !isMultiGenMode && connectedRefImages.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {connectedRefImages.length} reference image
              {connectedRefImages.length !== 1 ? "s" : ""} connected
            </p>
          )}
        </div>

        {/* Aspect ratio + variations */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
            <Select
              value={data.aspectRatio ?? "1:1"}
              onValueChange={(v) => update({ aspectRatio: v })}
            >
              <SelectTrigger className="nodrag h-8 text-xs">
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Variations</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={data.variationCount ?? 1}
              onChange={(e) =>
                update({ variationCount: parseInt(e.target.value) || 1 })
              }
              className="nodrag h-8 text-xs"
            />
          </div>
        </div>

        {/* Seed */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Seed (optional)</Label>
          <Input
            type="number"
            value={data.seed ?? ""}
            onChange={(e) =>
              update({
                seed: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="Random"
            className="nodrag h-8 text-xs"
          />
        </div>

        {/* Generate */}
      <Button
  size="sm"
  className="nodrag w-full"
  onClick={handleGenerate}
  disabled={
    generating ||
    (!isTemplateMode &&
      !isMultiGenMode &&
      !data.prompt?.trim() &&
      connectedRefImages.length === 0)
  }
>
  {generating ? (
    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
  ) : (
    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
  )}
  {generating ? "Generating..." : "Generate"}
</Button>

      </div>

      {/* ── RIGHT HANDLE — output to Output Node (Task 1) ─────────────────── */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3! h-3! bg-primary! border-2! border-background!"
      />
    </div>
  );
}
