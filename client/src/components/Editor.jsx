import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, ConnectionMode, useReactFlow } from '@xyflow/react';
import { useStore } from '../store.js';
import { DocCtx, MarksCtx } from '../context.js';
import { DIAGRAMS, makeEdge, makeNode } from '../lib/model.js';
import { autoLayout } from '../lib/layout.js';
import { nodeTypes } from './nodes.jsx';
import { edgeTypes } from './UmlEdge.jsx';
import Palette from './Palette.jsx';
import Inspector from './Inspector.jsx';
import Icon from './Icon.jsx';

const EMPTY_MARKS = { nodes: {}, edges: {} };
const DEFAULT_EDGE = { type: 'uml' };

function EditorInner({ docId, marks, extras }) {
  const doc = useStore((s) => s.docs[docId]);
  const theme = useStore((s) => s.theme);
  const rf = useReactFlow();
  const wrap = useRef(null);
  const type = doc && doc.type;
  const [rel, setRel] = useState(type ? DIAGRAMS[type].relations[0] : 'association');
  const [snap, setSnap] = useState(false);
  const ctx = useMemo(() => ({ docId, readOnly: false }), [docId]);

  const onNodesChange = useCallback((c) => useStore.getState().onNodesChange(docId, c), [docId]);
  const onEdgesChange = useCallback((c) => useStore.getState().onEdgesChange(docId, c), [docId]);
  const onDragStart = useCallback(() => useStore.getState().snapshot(docId), [docId]);
  const onConnect = useCallback(
    (c) => {
      if (!c.source || !c.target || c.source === c.target) return;
      useStore.getState().addEdge(docId, makeEdge(c.source, c.target, type === 'er' ? 'er' : rel));
    },
    [docId, rel, type]
  );
  const isValid = useCallback((c) => c.source !== c.target, []);

  const addItem = useCallback(
    (item) => {
      const r = wrap.current.getBoundingClientRect();
      const center = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      useStore.getState().addNodeCentered(docId, item, center);
    },
    [docId, rf]
  );
  const onDrop = useCallback(
    (e) => {
      const raw = e.dataTransfer.getData('application/redpen');
      if (!raw) return;
      e.preventDefault();
      const item = JSON.parse(raw);
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      useStore.getState().addNode(docId, makeNode(item, { x: p.x - 60, y: p.y - 24 }));
    },
    [docId, rf]
  );

  const tidy = useCallback(() => {
    const d = useStore.getState().docs[docId];
    if (!d || !d.nodes.length) return;
    useStore.getState().replaceDiagram(docId, autoLayout(d.nodes, d.edges, d.type), d.edges);
    setTimeout(() => rf.fitView({ padding: 0.25, maxZoom: 1, duration: 350 }), 60);
  }, [docId, rf]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const s = useStore.getState();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(docId); else s.undo(docId); }
      else if (mod && k === 'y') { e.preventDefault(); s.redo(docId); }
      else if (mod && k === 'd') { e.preventDefault(); s.duplicateSelected(docId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docId]);

  if (!doc) return null;
  const hasSelection = doc.nodes.some((n) => n.selected) || doc.edges.some((e) => e.selected);
  const st = useStore.getState();

  return (
    <DocCtx.Provider value={ctx}>
      <MarksCtx.Provider value={marks || EMPTY_MARKS}>
        <div className="editor">
          <div className="editor-toolbar" role="toolbar" aria-label="Diagram tools">
            <div className="tool-group">
              <button className="icon-btn" onClick={() => st.undo(docId)} disabled={!doc.past.length} title="Undo (Ctrl/⌘ Z)" aria-label="Undo"><Icon name="undo" /></button>
              <button className="icon-btn" onClick={() => st.redo(docId)} disabled={!doc.future.length} title="Redo (Ctrl/⌘ Shift Z)" aria-label="Redo"><Icon name="redo" /></button>
            </div>
            <div className="tool-group">
              <button className="icon-btn" onClick={() => st.duplicateSelected(docId)} disabled={!hasSelection} title="Duplicate (Ctrl/⌘ D)" aria-label="Duplicate"><Icon name="copy" /></button>
              <button className="icon-btn" onClick={() => st.deleteSelected(docId)} disabled={!hasSelection} title="Delete selection" aria-label="Delete"><Icon name="trash" /></button>
            </div>
            <div className="tool-group">
              <button className="btn ghost" onClick={tidy} disabled={!doc.nodes.length} title="Arrange boxes neatly"><Icon name="layout" size={16} />Tidy up</button>
              <button className="icon-btn" onClick={() => rf.fitView({ padding: 0.25, maxZoom: 1, duration: 300 })} title="Fit to screen" aria-label="Fit to screen"><Icon name="fit" /></button>
              <button className={`icon-btn ${snap ? 'on' : ''}`} onClick={() => setSnap(!snap)} aria-pressed={snap} title="Snap to grid" aria-label="Snap to grid"><Icon name="grid" /></button>
            </div>
            <div className="tool-spacer" />
            <div className="tool-group">{extras}</div>
          </div>

          <Palette type={doc.type} rel={rel} onRel={setRel} onAdd={addItem} />

          <div className="editor-canvas" ref={wrap} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDrop}>
            <ReactFlow
              nodes={doc.nodes}
              edges={doc.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={DEFAULT_EDGE}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValid}
              onNodeDragStart={onDragStart}
              onSelectionDragStart={onDragStart}
              connectionMode={ConnectionMode.Loose}
              snapToGrid={snap}
              snapGrid={[12, 12]}
              colorMode={theme}
              fitView
              fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={2}
              elevateNodesOnSelect={false}
              deleteKeyCode={['Backspace', 'Delete']}
              connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2 }}
            >
              <Background variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="var(--grid)" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable ariaLabel="Overview" nodeColor="var(--line)" maskColor="var(--minimap-mask)" />
            </ReactFlow>
            {!doc.nodes.length && (
              <div className="canvas-hint">
                <strong>Blank board</strong>
                <span>Click an item on the left, or drag it here.</span>
              </div>
            )}
          </div>

          <Inspector docId={docId} doc={doc} />
        </div>
      </MarksCtx.Provider>
    </DocCtx.Provider>
  );
}

export default function Editor(props) {
  const exists = useStore((s) => !!s.docs[props.docId]);
  if (!exists) return null;
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
