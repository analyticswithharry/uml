import { useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import { useStore } from '../store.js';
import { DocCtx, MarksCtx } from '../context.js';
import { nodeTypes } from './nodes.jsx';
import { edgeTypes } from './UmlEdge.jsx';

const EMPTY = { nodes: {}, edges: {} };

export default function ReadOnlyDiagram({ nodes, edges }) {
  const theme = useStore((s) => s.theme);
  const ctx = useMemo(() => ({ docId: null, readOnly: true }), []);
  return (
    <DocCtx.Provider value={ctx}>
      <MarksCtx.Provider value={EMPTY}>
        <div className="readonly-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={theme}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="var(--grid)" />
          </ReactFlow>
        </div>
      </MarksCtx.Provider>
    </DocCtx.Provider>
  );
}
