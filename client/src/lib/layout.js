import * as dagreNs from '@dagrejs/dagre';
import { estimateSize } from './model.js';

const dagre = dagreNs.default || dagreNs;
const UP = new Set(['generalization', 'realization', 'aggregation', 'composition']);

/** Tidy layout. Parents / wholes end up above their children / parts. */
export function autoLayout(nodes, edges, type) {
  const g = new dagre.graphlib.Graph();
  const horizontal = type === 'usecase';
  g.setGraph({ rankdir: horizontal ? 'LR' : 'TB', nodesep: horizontal ? 50 : 70, ranksep: horizontal ? 130 : 100, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  const items = nodes.filter((n) => n.type !== 'boundary' && n.type !== 'note');
  items.forEach((n) => { const s = estimateSize(n); g.setNode(n.id, { width: s.w, height: s.h }); });
  edges.forEach((e) => {
    if (e.source === e.target || !g.hasNode(e.source) || !g.hasNode(e.target)) return;
    const rel = e.data && e.data.relType;
    if (!horizontal && UP.has(rel)) g.setEdge(e.target, e.source);
    else g.setEdge(e.source, e.target);
  });
  dagre.layout(g);

  let out = nodes.map((n) => {
    if (!g.hasNode(n.id)) return n;
    const p = g.node(n.id);
    const s = estimateSize(n);
    return { ...n, position: { x: Math.round(p.x - s.w / 2), y: Math.round(p.y - s.h / 2) } };
  });

  // keep a system boundary wrapped around its use cases
  const boundary = out.find((n) => n.type === 'boundary');
  const cases = out.filter((n) => n.type === 'useCase');
  if (boundary && cases.length) {
    const pad = 40;
    const xs = cases.map((n) => n.position.x);
    const ys = cases.map((n) => n.position.y);
    const x2 = cases.map((n) => n.position.x + estimateSize(n).w);
    const y2 = cases.map((n) => n.position.y + estimateSize(n).h);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad - 24;
    out = out.map((n) => (n.id === boundary.id ? { ...n, position: { x: minX, y: minY }, width: Math.max(...x2) + pad - minX, height: Math.max(...y2) + pad - minY } : n));
  }
  return out;
}
