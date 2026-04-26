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
import { LayoutTemplate, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectTemplate } from "@/lib/project-templates";
import { TemplatePickerDialog } from "@/components/projects/panels/template-picker-dialog";

// These constants must match the exact pixel heights of the Tailwind classes used below.
// h-9  = 36px  →  used for the header row and each slot row
// h-24 = 96px  →  used for the template preview image
const HEADER_H = 36;
const PREVIEW_H = 96;
const SLOT_H = 36;

export type TemplateNodeData = {
  templateId?: string;
  template?: ProjectTemplate; // full template object stored in node data
  slotConnections: Record<string, string>; // slot.id → imageUrl (updated in Phase 8)
};

export type TemplateNodeType = Node<TemplateNodeData, "template">;

export function TemplateNode({
  id,
  data,
  selected,
}: NodeProps<TemplateNodeType>) {
  // Open the picker immediately if no template selected yet
  const [pickerOpen, setPickerOpen] = useState(!data.templateId);
  const { updateNodeData, deleteElements, getNode } = useReactFlow();
  const edges = useEdges(); // re-renders when edges change so slot status stays live

  // Reactively build slotConnections from edges: slot.id → connected reference image URL
useEffect(() => {
  if (!data.template) return; // No template selected yet

  const newSlotConnections: Record<string, string> = {};

  // For each edge targeting a slot handle on this Template Node
  edges.forEach((e) => {
    if (e.target === id && e.targetHandle?.startsWith("slot-")) {
      const slotId = e.targetHandle.slice("slot-".length);
      const sourceNode = getNode(e.source);
      const imageUrl = (sourceNode?.data as { imageUrl?: string })?.imageUrl;

      // Only add to record if the source node has an image
      if (imageUrl) {
        newSlotConnections[slotId] = imageUrl;
      }
    }
  });

  // Only update if something changed to avoid infinite loops
  if (JSON.stringify(newSlotConnections) !== JSON.stringify(data.slotConnections)) {
    updateNodeData(id, { slotConnections: newSlotConnections });
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [edges, id, data.template, getNode, updateNodeData]);

  // Which slot IDs have a Reference Node connected?
  // Each slot handle has id "slot-{slotId}" — we check incoming edges for that handle id
  const connectedSlotIds = new Set(
    edges
      .filter((e) => e.target === id && e.targetHandle?.startsWith("slot-"))
      .map((e) => e.targetHandle!.slice("slot-".length)),
  );

  return (
    // overflow: visible is required — handle dots extend past the card's left edge.
    // Without it, overflow: hidden on the card would clip the handles.
    <div className="relative" style={{ overflow: "visible" }}>

      {/* The visible card — no overflow-hidden on this outer div */}
      <div
        className={cn(
          "w-64 rounded-xl border bg-card shadow-sm transition-shadow group",
          selected
            ? "border-primary shadow-md shadow-primary/20"
            : "border-border",
        )}
      >
        {/* Header — h-9 = 36px — must match HEADER_H */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Template
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {data.template && (
              <span className="text-[10px] text-muted-foreground">
                {data.template.category}
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

        {data.template ? (
          <>
            {/* Preview image — h-24 = 96px — must match PREVIEW_H */}
            <div
              className="h-24 relative overflow-hidden cursor-pointer"
              onClick={() => setPickerOpen(true)}
            >
              <img
                src={data.template.thumbnailUrl}
                alt={data.template.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0";
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-2">
                <p className="text-white text-xs font-medium">
                  {data.template.name}
                </p>
              </div>
            </div>

            {/* Slot rows — each h-9 = 36px — must match SLOT_H */}
            {data.template.slots.map((slot) => {
              const isConnected = connectedSlotIds.has(slot.id);
              return (
                <div
                  key={slot.id}
                  className="h-9 flex items-center gap-2 px-3 border-t border-border"
                >
                  {isConnected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full border-2 shrink-0",
                        slot.required
                          ? "border-amber-500"
                          : "border-muted-foreground/40",
                      )}
                    />
                  )}
                  <span className="text-xs truncate flex-1">{slot.label}</span>
                  {slot.required && !isConnected && (
                    <span className="text-[10px] text-amber-500 shrink-0">
                      req
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Empty state — shown before a template is picked */
          <button
            className="w-full flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors rounded-b-xl"
            onClick={() => setPickerOpen(true)}
          >
            <LayoutTemplate className="h-8 w-8 opacity-40" />
            <span className="text-xs">Click to select template</span>
          </button>
        )}
      </div>

      {/* Slot input handles — rendered outside the card as siblings.
          top = header + preview + (slot index × slot height) + half a slot height
          This centers each handle dot on its corresponding slot row. */}
      {data.template?.slots.map((slot, i) => (
        <Handle
          key={slot.id}
          type="target"
          position={Position.Left}
          id={`slot-${slot.id}`}
          style={{
            top: HEADER_H + PREVIEW_H + SLOT_H * i + SLOT_H / 2,
            left: -6,
          }}
          className="w-3! h-3! bg-card! border-2! border-primary!"
        />
      ))}

      {/* Output on the RIGHT — Template Node sits left of Control Node,
          wire goes right to the Control Node's left handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3! h-3! bg-primary! border-2! border-background!"
      />

      <TemplatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(template) => {
          updateNodeData(id, {
            templateId: template.id,
            template,
            slotConnections: {},
          });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
