import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { uid, makeNode, estimateSize, toDiagramFile } from './lib/model.js';

/**
 * Everything the student draws lives here, in browser memory only.
 * Nothing touches localStorage, cookies or the server, so a refresh starts clean.
 */
const HISTORY_LIMIT = 80;
const copy = (x) => JSON.parse(JSON.stringify(x));
const frozen = (doc) => ({
  nodes: doc.nodes.map(({ selected, dragging, resizing, ...n }) => copy(n)),
  edges: doc.edges.map(({ selected, ...e }) => copy(e)),
});

export const useStore = create((set, get) => {
  const patch = (docId, fn, bump = true) =>
    set((s) => {
      const doc = s.docs[docId];
      if (!doc) return s;
      const next = fn(doc);
      return { docs: { ...s.docs, [docId]: { ...doc, ...next, rev: bump ? doc.rev + 1 : doc.rev } } };
    });

  return {
    docs: {},
    order: [], // studio tabs (practice boards are kept in docs too, but not listed)
    activeId: null,
    progress: {}, // puzzleId -> { attempts, best, solved }
    theme: typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    toasts: [],

    /* ---------- boards ---------- */
    createDoc({ type, title, nodes = [], edges = [], puzzleId = null, id }) {
      const docId = id || uid('d');
      const doc = { id: docId, type, title: title || 'Untitled diagram', nodes, edges, past: [], future: [], rev: 0, puzzleId, createdAt: Date.now() };
      set((s) => ({
        docs: { ...s.docs, [docId]: doc },
        order: puzzleId ? s.order : [...s.order, docId],
        activeId: puzzleId ? s.activeId : docId,
      }));
      return docId;
    },
    openDoc: (id) => set({ activeId: id }),
    closeDoc(id) {
      set((s) => {
        const { [id]: _gone, ...docs } = s.docs;
        const order = s.order.filter((x) => x !== id);
        return { docs, order, activeId: s.activeId === id ? order[order.length - 1] || null : s.activeId };
      });
    },
    renameDoc: (id, title) => patch(id, () => ({ title }), false),
    ensurePuzzleDoc(puzzle) {
      const id = `puzzle:${puzzle.id}`;
      if (!get().docs[id]) {
        get().createDoc({ id, type: puzzle.diagramType, title: puzzle.title, puzzleId: puzzle.id, nodes: copy(puzzle.initial.nodes), edges: copy(puzzle.initial.edges) });
      }
      return id;
    },
    resetPuzzleDoc(puzzle) {
      const id = `puzzle:${puzzle.id}`;
      patch(id, () => ({ nodes: copy(puzzle.initial.nodes), edges: copy(puzzle.initial.edges), past: [], future: [] }));
    },
    loadWorkspace(file) {
      let n = 0;
      (file.docs || []).forEach((d) => {
        if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.edges) || !d.type) return;
        get().createDoc({ type: d.type, title: d.title, nodes: d.nodes, edges: d.edges });
        n++;
      });
      if (file.progress && typeof file.progress === 'object') set((s) => ({ progress: { ...s.progress, ...file.progress } }));
      return n;
    },
    workspaceFile() {
      const s = get();
      return { app: 'redpen-uml-workspace', version: 1, docs: s.order.map((id) => toDiagramFile(s.docs[id])), progress: s.progress };
    },

    /* ---------- history ---------- */
    snapshot(docId) {
      patch(docId, (d) => ({ past: [...d.past.slice(-(HISTORY_LIMIT - 1)), frozen(d)], future: [] }), false);
    },
    undo(docId) {
      patch(docId, (d) => {
        if (!d.past.length) return {};
        const prev = d.past[d.past.length - 1];
        return { nodes: prev.nodes, edges: prev.edges, past: d.past.slice(0, -1), future: [...d.future, frozen(d)] };
      });
    },
    redo(docId) {
      patch(docId, (d) => {
        if (!d.future.length) return {};
        const nxt = d.future[d.future.length - 1];
        return { nodes: nxt.nodes, edges: nxt.edges, future: d.future.slice(0, -1), past: [...d.past, frozen(d)] };
      });
    },

    /* ---------- diagram edits ---------- */
    onNodesChange(docId, changes) {
      const structural = changes.some((c) => c.type !== 'select' && c.type !== 'dimensions');
      if (changes.some((c) => c.type === 'remove')) get().snapshot(docId);
      patch(docId, (d) => ({ nodes: applyNodeChanges(changes, d.nodes) }), structural);
    },
    onEdgesChange(docId, changes) {
      const structural = changes.some((c) => c.type !== 'select');
      if (changes.some((c) => c.type === 'remove')) get().snapshot(docId);
      patch(docId, (d) => ({ edges: applyEdgeChanges(changes, d.edges) }), structural);
    },
    addNode(docId, node) {
      get().snapshot(docId);
      patch(docId, (d) => ({ nodes: [...d.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), { ...node, selected: true }] }));
    },
    addEdge(docId, edge) {
      get().snapshot(docId);
      patch(docId, (d) => ({ edges: [...d.edges.map((e) => (e.selected ? { ...e, selected: false } : e)), { ...edge, selected: true }] }));
    },
    updateNodeData: (docId, id, data) => patch(docId, (d) => ({ nodes: d.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)) })),
    updateEdgeData: (docId, id, data) => patch(docId, (d) => ({ edges: d.edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...data } } : e)) })),
    swapEdge(docId, id) {
      get().snapshot(docId);
      patch(docId, (d) => ({
        edges: d.edges.map((e) => {
          if (e.id !== id) return e;
          const x = e.data || {};
          return { ...e, source: e.target, target: e.source, data: { ...x, sourceMult: x.targetMult, targetMult: x.sourceMult, sourceCard: x.targetCard, targetCard: x.sourceCard } };
        }),
      }));
    },
    replaceDiagram(docId, nodes, edges) {
      get().snapshot(docId);
      patch(docId, () => ({ nodes, edges }));
    },
    deleteSelected(docId) {
      const d = get().docs[docId];
      if (!d || !(d.nodes.some((n) => n.selected) || d.edges.some((e) => e.selected))) return;
      get().snapshot(docId);
      patch(docId, (doc) => {
        const gone = new Set(doc.nodes.filter((n) => n.selected).map((n) => n.id));
        return { nodes: doc.nodes.filter((n) => !gone.has(n.id)), edges: doc.edges.filter((e) => !e.selected && !gone.has(e.source) && !gone.has(e.target)) };
      });
    },
    duplicateSelected(docId) {
      const d = get().docs[docId];
      const sel = d && d.nodes.filter((n) => n.selected && n.type !== 'boundary');
      if (!sel || !sel.length) return;
      get().snapshot(docId);
      const map = {};
      const clones = sel.map((n) => {
        const id = uid('n');
        map[n.id] = id;
        return { ...copy({ ...n, selected: undefined, dragging: undefined, measured: undefined }), id, position: { x: n.position.x + 36, y: n.position.y + 36 }, selected: true };
      });
      const edges = d.edges.filter((e) => map[e.source] && map[e.target]).map((e) => ({ ...copy(e), id: uid('e'), source: map[e.source], target: map[e.target], selected: false }));
      patch(docId, (doc) => ({ nodes: [...doc.nodes.map((n) => ({ ...n, selected: false })), ...clones], edges: [...doc.edges, ...edges] }));
    },
    addNodeCentered(docId, item, center) {
      const size = estimateSize(makeNode(item, { x: 0, y: 0 }));
      const jitter = (get().docs[docId]?.nodes.length || 0) % 5;
      get().addNode(docId, makeNode(item, { x: center.x - size.w / 2 + jitter * 18, y: center.y - size.h / 2 + jitter * 18 }));
    },

    /* ---------- practice progress ---------- */
    recordAttempt(puzzleId, { score, correct }) {
      set((s) => {
        const p = s.progress[puzzleId] || { attempts: 0, best: 0, solved: false };
        return { progress: { ...s.progress, [puzzleId]: { attempts: p.attempts + 1, best: Math.max(p.best, score), solved: p.solved || correct } } };
      });
    },

    /* ---------- ui ---------- */
    setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      set({ theme });
    },
    toast(message, kind = 'info') {
      const id = uid('t');
      set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
    },
  };
});
