"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  BackgroundVariant,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type OnConnectStart,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Project, ProjectGeneration } from "@prisma/client";

import { ReferenceNode } from "@/components/projects/nodes/reference-node";
import { TemplateNode } from "@/components/projects/nodes/template-node";
import { ControlNode } from "@/components/projects/nodes/control-node";
import { OutputNode } from "@/components/projects/nodes/output-node";
import { MultiGenNode } from "@/components/projects/nodes/multigen-node";
import { SpatialNode } from "@/components/projects/nodes/spatial-node";
import { OutputGroupNode } from "@/components/projects/nodes/output-group-node";
import { CustomEdge } from "@/components/projects/edges/custom-edge";
import { ProjectContext } from "@/components/projects/project-context";
import { refreshGenerations } from "@/actions/projects";

import { Input } from "@/components/ui/input";
import {
  Loader2,
  CheckCircle2,
  ImageIcon,
  LayoutTemplate,
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Plus,
} from "lucide-react";

// ─── CRITICAL: defined at module level, never inside the component ────────────
const nodeTypes: NodeTypes = {
  reference: ReferenceNode,
  template: TemplateNode,
  control: ControlNode,
  output: OutputNode,
  multigen: MultiGenNode,
  spatial: SpatialNode,
  "output-group": OutputGroupNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};
// ──────────────────────────────────────────────────────────────────────────────

function createDefaultControlNode(): Node {
  return {
    id: "control-default",
    type: "control",
    position: { x: 400, y: 280 },
    data: { aspectRatio: "1:1", variationCount: 1, model: "nano-banana-2" },
    deletable: false,
  };
}

type ProjectWithGenerations = Project & { generations: ProjectGeneration[] };

// ─── Reusable toolbar button ───────────────────────────────────────────────────
function ControlButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
    >
      {children}
    </button>
  );
}

// ─── Custom canvas controls ────────────────────────────────────────────────────
// Rendered inside <ReactFlow> as a <Panel> so useReactFlow() is available.
// Groups: [Add Node dropdown] | [Zoom In / Out / Fit] | [Undo / Redo]
function CustomControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddNode,
}: {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddNode: (type: "control" | "spatial" | "reference") => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handler = (e: Event) => {
      const target = (e as MouseEvent).target as HTMLElement;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    };

    // Listen on document for clicks outside dropdown
    document.addEventListener("mousedown", handler);

    // Also listen on React Flow canvas since it captures events
    const canvas = document.querySelector(".react-flow__pane");
    canvas?.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      canvas?.removeEventListener("mousedown", handler);
    };
  }, [dropdownOpen]);

  return (
    <Panel position="top-right">
      <div className="flex flex-row gap-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-sm">
        {/* Add Node dropdown — shows three node type options */}
        <div className="relative" ref={dropdownRef}>
          <ControlButton
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Add node"
          >
            <Plus className="h-4 w-4" />
          </ControlButton>

          {dropdownOpen && (
            <div className="absolute z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-44 left-0 top-full mt-1">
              <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                Add node
              </p>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  onAddNode("reference");
                  setDropdownOpen(false);
                }}
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                Reference Node
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  onAddNode("control");
                  setDropdownOpen(false);
                }}
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                </div>
                Control Node
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                onClick={() => {
                  onAddNode("spatial");
                  setDropdownOpen(false);
                }}
              >
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                Spatial Node
              </button>
            </div>
          )}
        </div>

        <div className="w-px bg-border my-1 mx-0.5" />

        {/* Viewport controls */}
        <ControlButton onClick={() => zoomIn()} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </ControlButton>
        <ControlButton onClick={() => zoomOut()} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          onClick={() => fitView({ padding: 0.1 })}
          title="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </ControlButton>

        <div className="w-px bg-border my-1 mx-0.5" />

        {/* History controls */}
        <ControlButton
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </ControlButton>
        <ControlButton
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </ControlButton>
      </div>
    </Panel>
  );
}

// ─── Drag-from-handle dropdown ─────────────────────────────────────────────────
function ConnectDropdown({
  position,
  hasTemplate,
  hasMultiGen,
  onSelect,
  onClose,
}: {
  position: { x: number; y: number };
  hasTemplate: boolean;
  hasMultiGen: boolean;
  onSelect: (type: "reference" | "template" | "multigen" | "spatial") => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-44"
      style={{ left: position.x, top: position.y }}
    >
      <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
        Add node
      </p>
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
        onClick={() => onSelect("reference")}
      >
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        Reference Node
      </button>
      <button
        className={
          hasTemplate
            ? "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm opacity-40 cursor-not-allowed text-left"
            : "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
        }
        onClick={() => !hasTemplate && onSelect("template")}
        title={hasTemplate ? "Only one template per canvas" : undefined}
      >
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
        </div>
        Template Node
      </button>
      <button
        className={
          hasMultiGen
            ? "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm opacity-40 cursor-not-allowed text-left"
            : "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
        }
        onClick={() => !hasMultiGen && onSelect("multigen")}
        title={hasMultiGen ? "Only one MultiGen per canvas" : undefined}
      >
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Layers className="h-3.5 w-3.5 text-primary" />
        </div>
        MultiGen Node
      </button>
      {/* Spatial Node — multiple allowed, no guard needed */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
        onClick={() => onSelect("spatial")}
      >
        <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        Spatial Node
      </button>
    </div>
  );
}

export function ProjectEditorClient({
  project,
}: {
  project: ProjectWithGenerations;
}) {
  const storedNodes = project.nodesJson as Node[] | null;
  const storedEdges = project.edgesJson as Edge[] | null;

  const initialNodes: Node[] =
    storedNodes && storedNodes.length > 0
      ? storedNodes
      : [createDefaultControlNode()];
  const initialEdges: Edge[] = storedEdges ?? [];

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  const [generations, setGenerations] = useState<ProjectGeneration[]>(
    project.generations,
  );
  const [projectName, setProjectName] = useState(project.name);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // ── Undo / redo history ────────────────────────────────────────────────────
  // Stored as refs so the stacks don't cause re-renders on every push/pop.
  // Only `canUndo` / `canRedo` are state — they drive the button disabled prop.
  const MAX_HISTORY = 50;
  const past = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // snapshot() — call this immediately BEFORE any state mutation you want undoable.
  const snapshot = useCallback(() => {
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes, edges },
    ];
    future.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1]!;
    past.current = past.current.slice(0, -1);
    future.current = [
      { nodes, edges },
      ...future.current.slice(0, MAX_HISTORY - 1),
    ];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current[0]!;
    future.current = future.current.slice(1);
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes, edges },
    ];
    setNodes(next.nodes);
    setEdges(next.edges);
    setCanUndo(true);
    setCanRedo(future.current.length > 0);
  }, [nodes, edges, setNodes, setEdges]);

  // Keyboard shortcuts — skipped when an input/textarea has focus.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
  // ──────────────────────────────────────────────────────────────────────────

  // ── Drag-to-handle dropdown state ─────────────────────────────────────────
  const [connectDropdown, setConnectDropdown] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const draggingFromAddHandle = useRef(false);
  // Stable refs so onConnectStart/onConnectEnd can read current state without
  // being recreated on every node/edge change (avoids excessive callback churn).
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  // Tracks when a drag originates from a Spatial Node's slot handle.
  // Cleared on every onConnectEnd regardless of outcome.
  const draggingFromSpatialSlot = useRef<{ nodeId: string; handleId: string } | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ── Autosave ───────────────────────────────────────────────────────────────
  const triggerAutosave = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[], name: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus("saving");
      saveTimerRef.current = setTimeout(() => {
        void fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            nodesJson: updatedNodes,
            edgesJson: updatedEdges,
          }),
        }).then(() => setSaveStatus("saved"));
      }, 2000);
    },
    [project.id],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerAutosave(nodes, edges, projectName);
  }, [nodes, edges, projectName, triggerAutosave]);

  // ── Smart polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    const hasActive = generations.some(
      (g) => g.status === "PROCESSING" || g.status === "PENDING",
    );
    if (!hasActive) return;

    const interval = setInterval(async () => {
      const result = await refreshGenerations(project.id);
      if (result.success) setGenerations(result.generations);
    }, 5000);

    return () => clearInterval(interval);
  }, [generations, project.id]);

  // ── Wrapped change handlers ────────────────────────────────────────────────
  // Snapshot before any removal so the delete key is undoable.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((c) => c.type === "remove")) snapshot();
      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal, snapshot],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) snapshot();
      onEdgesChangeInternal(changes);
    },
    [onEdgesChangeInternal, snapshot],
  );

  // Snapshot at drag start so repositioning a node is undoable.
  const onNodeDragStart = useCallback(() => {
    snapshot();
  }, [snapshot]);

  // ── onConnect ──────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      snapshot();
      setEdges((eds) => addEdge({ ...connection, type: "custom" }, eds));
    },
    [setEdges, snapshot],
  );

  // ── Connection validation ──────────────────────────────────────────────────
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const source = connection.source;
      const target = connection.target;
      if (source === target) return false;

      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sType = sourceNode.type;
      const tType = targetNode.type;

      if (sType === "reference" && tType === "template") return true;
      if (sType === "reference" && tType === "multigen") return true;

      if (sType === "reference" && tType === "control") {
        return !edges.some(
          (e) =>
            e.target === target &&
            (nodes.find((n) => n.id === e.source)?.type === "template" ||
              nodes.find((n) => n.id === e.source)?.type === "multigen"),
        );
      }

      if (sType === "template" && tType === "control") {
        return !edges.some(
          (e) =>
            e.target === target &&
            (nodes.find((n) => n.id === e.source)?.type === "reference" ||
              nodes.find((n) => n.id === e.source)?.type === "multigen"),
        );
      }

      if (sType === "multigen" && tType === "control") {
        return !edges.some(
          (e) =>
            e.target === target &&
            (nodes.find((n) => n.id === e.source)?.type === "template" ||
              nodes.find((n) => n.id === e.source)?.type === "reference"),
        );
      }

      if (sType === "control" && tType === "output") return true;

      // Spatial rules — spatial is a standalone pipeline, not connected to Control Node
      if (sType === "reference" && tType === "spatial") {
        // Each slot handle accepts exactly one incoming Reference Node.
        // Block the connection if this specific handle already has an edge.
        const targetHandle = connection.targetHandle;
        if (!targetHandle) return false;
        return !edges.some(
          (e) => e.target === target && e.targetHandle === targetHandle,
        );
      }

      if (sType === "spatial" && tType === "output") return true;

      return false;
    },
    [nodes, edges],
  );

  // ── Add Node (toolbar button) ─────────────────────────────────────────────
  // Supports three node types: control, spatial, reference
  // Offsets each new control/reference node so they don't stack exactly on top of each other.
  const handleAddNode = useCallback(
    (type: "control" | "spatial" | "reference") => {
      snapshot();
      const id = `${type}-${Date.now()}`;

      if (type === "control") {
        const existingControls = nodes.filter((n) => n.type === "control").length;
        setNodes((prev) => [
          ...prev,
          {
            id,
            type: "control",
            position: {
              x: 400 + existingControls * 80,
              y: 280 + existingControls * 80,
            },
            data: { aspectRatio: "1:1", variationCount: 1, model: "nano-banana-2" },
            deletable: true,
          },
        ]);
      } else if (type === "spatial") {
        setNodes((prev) => [
          ...prev,
          {
            id,
            type: "spatial",
            position: { x: 200, y: 400 },
            data: {
              slotConnections: {},
              directSlotPicks: {},
              aspectRatio: "1:1",
              variationCount: 1,
            },
            deletable: true,
          },
        ]);
      } else if (type === "reference") {
        setNodes((prev) => [
          ...prev,
          {
            id,
            type: "reference",
            position: { x: 100, y: 500 },
            data: { source: "asset" },
            deletable: true,
          },
        ]);
      }
    },
    [snapshot, nodes, setNodes],
  );

  // ── onConnectStart ─────────────────────────────────────────────────────────
  const onConnectStart: OnConnectStart = useCallback((event, params) => {
    const target = event.target as HTMLElement;
    draggingFromAddHandle.current =
      target.getAttribute("data-add-handle") === "true";

    // Detect drag originating from a Spatial Node slot handle.
    // handleId follows the "slot-{elementId}" convention set in spatial-node.tsx.
    // nodesRef gives us the current node list without closing over the state variable.
    if (
      params.nodeId &&
      params.handleId?.startsWith("slot-") &&
      nodesRef.current.find((n) => n.id === params.nodeId)?.type === "spatial"
    ) {
      draggingFromSpatialSlot.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
      };
    } else {
      draggingFromSpatialSlot.current = null;
    }
  }, []);

  // ── onConnectEnd ───────────────────────────────────────────────────────────
  const onConnectEnd: OnConnectEnd = useCallback((event) => {
    const isAddHandleDrag = draggingFromAddHandle.current;
    const spatialSlotInfo = draggingFromSpatialSlot.current;

    // Always clear both flags immediately
    draggingFromAddHandle.current = false;
    draggingFromSpatialSlot.current = null;

    const target = event.target as HTMLElement;
    const landedOnNode = !!target.closest(".react-flow__node");
    const landedOnHandle = !!target.closest(".react-flow__handle");

    // Only act when the drag ended on empty canvas space
    if (landedOnNode || landedOnHandle) return;

    const clientX =
      "touches" in event
        ? (event.changedTouches[0]?.clientX ?? 0)
        : (event as MouseEvent).clientX;
    const clientY =
      "touches" in event
        ? (event.changedTouches[0]?.clientY ?? 0)
        : (event as MouseEvent).clientY;

    if (isAddHandleDrag) {
      // Existing behaviour — show the node-type dropdown at the drop point
      setConnectDropdown({ x: clientX, y: clientY });
      return;
    }

    if (spatialSlotInfo) {
      const { nodeId: spatialNodeId, handleId } = spatialSlotInfo;

      // Guard: slot already has a Reference Node wired — don't create a second one
      const alreadyWired = edgesRef.current.some(
        (e) => e.target === spatialNodeId && e.targetHandle === handleId,
      );
      if (alreadyWired) return;

      const spatialNode = nodesRef.current.find((n) => n.id === spatialNodeId);
      if (!spatialNode) return;

      // Pixel constants matching spatial-node.tsx — keep in sync if those change
      const HEADER_H = 40;
      const PREVIEW_H = 112;
      const SLOT_H = 36;

      // Find the slot's row index inside the scene's elements array so we can
      // vertically align the new Reference Node with the correct slot row.
      const sceneElements =
        (spatialNode.data as { scene?: { elements: { id: string; label: string }[] } })
          ?.scene?.elements ?? [];
      const elementId = handleId.slice("slot-".length);
      const slotElement = sceneElements.find((el) => el.id === elementId);
      const slotIndex = slotElement ? sceneElements.indexOf(slotElement) : 0;
      const slotMidY =
        spatialNode.position.y +
        HEADER_H +
        PREVIEW_H +
        slotIndex * SLOT_H +
        SLOT_H / 2;

      snapshot();
      const newId = `reference-spatial-${Date.now()}`;

      setNodes((prev) => [
        ...prev,
        {
          id: newId,
          type: "reference",
          position: {
            x: spatialNode.position.x - 240,
            // Center the Reference Node card (approx 120px tall) on the slot row
            y: slotMidY - 60,
          },
          data: { source: "asset", slotLabel: slotElement?.label },
        },
      ]);

      setEdges((prev) =>
        addEdge(
          {
            id: `edge-${newId}-${spatialNodeId}`,
            source: newId,
            target: spatialNodeId,
            targetHandle: handleId,
            type: "custom",
          },
          prev,
        ),
      );
    }
  }, [snapshot, setNodes, setEdges]);

  // ── Dropdown node creation ─────────────────────────────────────────────────
  const handleConnectDropdownSelect = useCallback(
    (type: "reference" | "template" | "multigen" | "spatial") => {
      setConnectDropdown(null);
      snapshot();

      const controlNode = nodes.find((n) => n.type === "control");
      if (!controlNode) return;

      const existingRefs = nodes.filter((n) => n.type === "reference").length;
      const newId = `${type}-${Date.now()}`;

      let position: { x: number; y: number };
      if (type === "reference") {
        position = {
          x: controlNode.position.x - 260,
          y: controlNode.position.y + existingRefs * 60,
        };
      } else if (type === "template") {
        position = {
          x: controlNode.position.x - 340,
          y: controlNode.position.y - 200,
        };
      } else if (type === "multigen") {
        position = {
          x: controlNode.position.x - 300,
          y: controlNode.position.y - 160,
        };
      } else {
        // Spatial — placed below-left of the Control Node, not wired to it
        position = {
          x: controlNode.position.x - 380,
          y: controlNode.position.y + 220,
        };
      }

      setNodes((prev) => [
        ...prev,
        {
          id: newId,
          type,
          position,
          data:
            type === "reference"
              ? { source: "asset" }
              : type === "template"
                ? { slotConnections: {} }
                : type === "spatial"
                  ? { slotConnections: {}, directSlotPicks: {}, aspectRatio: "1:1", variationCount: 1 }
                  : {},
        },
      ]);

      // Spatial nodes are self-contained — they do not wire into the Control Node
      if (type !== "spatial") {
        setEdges((prev) =>
          addEdge(
            {
              id: `edge-${newId}-${controlNode.id}`,
              source: newId,
              target: controlNode.id,
              targetHandle: "input",
              type: "custom",
            },
            prev,
          ),
        );
      }
    },
    [nodes, setNodes, setEdges, snapshot],
  );

  const hasTemplate = nodes.some((n) => n.type === "template");
  const hasMultiGen = nodes.some((n) => n.type === "multigen");

  return (
    <ProjectContext.Provider
      value={{
        projectId: project.id,
        generations,
        onGenerationsUpdate: setGenerations,
      }}
    >
      <div className="h-[calc(100vh-3.5rem)] -mx-4 -mb-4 md:-m-6">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDragStart={onNodeDragStart}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={
            project.viewportJson as
              | { x: number; y: number; zoom: number }
              | undefined
          }
          fitView={initialNodes.length <= 1}
          colorMode="dark"
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="var(--border)"
          />

          <CustomControls
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onAddNode={handleAddNode}
          />

          <Panel
            position="top-left"
            className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-sm"
          >
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="nodrag h-7 w-44 text-sm font-medium border-none bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-15">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Saved
                </span>
              )}
            </span>
          </Panel>
        </ReactFlow>
      </div>

      {connectDropdown && (
        <ConnectDropdown
          position={connectDropdown}
          hasTemplate={hasTemplate}
          hasMultiGen={hasMultiGen}
          onSelect={handleConnectDropdownSelect}
          onClose={() => setConnectDropdown(null)}
        />
      )}
    </ProjectContext.Provider>
  );
}
