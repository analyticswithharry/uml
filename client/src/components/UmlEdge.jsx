import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, useInternalNode } from '@xyflow/react';
import { useMarks } from '../context.js';
import { REL } from '../lib/model.js';
import { nodeBox, outlinePoint, unit } from '../lib/geometry.js';
import { EndDecor } from './Decor.jsx';

const STEREO = { include: '«include»', extend: '«extend»' };

const UmlEdge = memo(function UmlEdge({ id, source, target, data, selected }) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  const marks = useMarks();
  if (!s || !t || source === target) return null;

  const d = data || {};
  const rel = d.relType || 'association';
  const status = marks.edges[id];
  const color = status === 'ok' ? 'var(--ok)' : status === 'wrong' || status === 'extra' ? 'var(--bad)' : selected ? 'var(--accent)' : 'var(--edge)';

  const a = nodeBox(s);
  const b = nodeBox(t);
  const p1 = outlinePoint(a, b.cx, b.cy);
  const p2 = outlinePoint(b, a.cx, a.cy);
  const u1 = unit(p1.x, p1.y, p2.x, p2.y);
  const u2 = { x: -u1.x, y: -u1.y };
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const n1 = { x: -u1.y, y: u1.x };
  const dashed = REL[rel] && REL[rel].dashed;
  const bg = 'var(--node-bg)';
  const showMult = rel !== 'er' && rel !== 'generalization' && rel !== 'realization' && rel !== 'include' && rel !== 'extend';
  const centerText = d.label || STEREO[rel] || '';
  const labelAt = (p, u, off) => ({ x: p.x + u.x * 30 + n1.x * off, y: p.y + u.y * 30 + n1.y * off });
  const m1 = labelAt(p1, u1, 14);
  const m2 = labelAt(p2, u2, 14);

  return (
    <>
      <BaseEdge id={id} path={`M${p1.x},${p1.y} L${p2.x},${p2.y}`} interactionWidth={24} style={{ stroke: color, strokeWidth: selected ? 2.6 : 1.9, strokeDasharray: dashed ? '7 5' : undefined }} />
      {rel === 'er' ? (
        <>
          <EndDecor rel="er" card={d.sourceCard} x={p1.x} y={p1.y} ux={u1.x} uy={u1.y} color={color} bg={bg} />
          <EndDecor rel="er" card={d.targetCard} x={p2.x} y={p2.y} ux={u2.x} uy={u2.y} color={color} bg={bg} />
        </>
      ) : (
        <EndDecor rel={rel} x={p2.x} y={p2.y} ux={u2.x} uy={u2.y} color={color} bg={bg} />
      )}
      {(status === 'ok' || status === 'wrong' || status === 'extra') && (
        <g transform={`translate(${mid.x},${mid.y - (centerText ? 20 : 0)})`} className="edge-mark">
          <circle r="10" fill={bg} stroke={color} strokeWidth="1.8" />
          <path d={status === 'ok' ? 'M-4.5 0.5 -1.5 3.5 4.5 -3.5' : 'M-4 -4 4 4M4 -4-4 4'} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      <EdgeLabelRenderer>
        {centerText && (
          <div className={`edge-label ${STEREO[rel] && !d.label ? 'stereo-label' : ''}`} style={{ transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`, color }}>
            {centerText}
          </div>
        )}
        {showMult && d.sourceMult && (
          <div className="edge-label mult" style={{ transform: `translate(-50%, -50%) translate(${m1.x}px, ${m1.y}px)` }}>{d.sourceMult}</div>
        )}
        {showMult && d.targetMult && (
          <div className="edge-label mult" style={{ transform: `translate(-50%, -50%) translate(${m2.x}px, ${m2.y}px)` }}>{d.targetMult}</div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});

export const edgeTypes = { uml: UmlEdge };
