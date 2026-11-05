'use client';

import { Background, Controls, ConnectionMode, ReactFlow, ReactFlowProvider, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { toFlow } from '@/lib/er-layout';
import type { ErModel } from '@/lib/types';
import { erEdgeTypes, erNodeTypes } from './ErParts';

/** Diagrama E/R de solo lectura (semana 4). */
export default function ErView({ model, height = 460 }: { model: ErModel; height?: number }) {
  const { nodes, edges } = useMemo(() => toFlow(model), [model]);
  return (
    <div className="rf-wrap" style={{ height }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes as unknown as Node[]}
          edges={edges as unknown as Edge[]}
          nodeTypes={erNodeTypes}
          edgeTypes={erEdgeTypes}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          minZoom={0.15}
          fitViewOptions={{ padding: 0.12 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#d9dadc" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
