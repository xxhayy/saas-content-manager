"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  // getBezierPath produces a smooth S-curve — better than stepped paths for
  // a horizontal left-to-right canvas layout
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        strokeWidth: selected ? 2 : 1.5,
        stroke: selected ? "var(--primary)" : "var(--border)",
      }}
    />
  );
}
