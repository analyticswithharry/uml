import { REL } from '../lib/model.js';

/**
 * Line-end symbols drawn as plain SVG (no <marker> defs), so they survive PNG/SVG export.
 * (x, y) is the point on the box outline; (ux, uy) is the unit vector pointing along the line, away from the box.
 */
export function EndDecor({ rel, card, x, y, ux, uy, color, bg }) {
  const nx = -uy;
  const ny = ux;
  const pt = (d, w = 0) => `${(x + ux * d + nx * w).toFixed(1)},${(y + uy * d + ny * w).toFixed(1)}`;
  const at = (d, w = 0) => ({ x: x + ux * d + nx * w, y: y + uy * d + ny * w });
  const s = { stroke: color, strokeWidth: 1.7, strokeLinejoin: 'round', strokeLinecap: 'round' };

  if (rel === 'generalization' || rel === 'realization') {
    return <polygon points={`${pt(0)} ${pt(16, 8.5)} ${pt(16, -8.5)}`} fill={bg} {...s} />;
  }
  if (rel === 'aggregation' || rel === 'composition') {
    return <polygon points={`${pt(0)} ${pt(11, 6.5)} ${pt(22)} ${pt(11, -6.5)}`} fill={rel === 'composition' ? color : bg} {...s} />;
  }
  if (rel === 'dependency' || rel === 'include' || rel === 'extend') {
    return <polyline points={`${pt(12, 6.5)} ${pt(0)} ${pt(12, -6.5)}`} fill="none" {...s} />;
  }
  if (rel === 'er') {
    const bar = (d, key) => {
      const a = at(d, 8);
      const b = at(d, -8);
      return <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...s} />;
    };
    const ring = (d) => {
      const c = at(d);
      return <circle key="ring" cx={c.x} cy={c.y} r={5.2} fill={bg} {...s} />;
    };
    const foot = () => {
      const tip = at(15);
      return [8, 0, -8].map((w) => {
        const e = at(0, w);
        return <line key={`f${w}`} x1={tip.x} y1={tip.y} x2={e.x} y2={e.y} {...s} />;
      });
    };
    switch (card) {
      case 'one_only': return <g>{bar(10, 'a')}{bar(17, 'b')}</g>;
      case 'zero_or_one': return <g>{bar(10, 'a')}{ring(21)}</g>;
      case 'one_or_many': return <g>{foot()}{bar(22, 'a')}</g>;
      case 'zero_or_many': return <g>{foot()}{ring(26)}</g>;
      default: return null;
    }
  }
  return null;
}

/** Small drawn sample of a relationship, for the palette and the cheatsheet. */
export function EdgeSample({ rel, sourceCard, targetCard, width = 132, height = 36 }) {
  const y = height / 2;
  const x1 = 10;
  const x2 = width - 10;
  const info = REL[rel] || {};
  const color = 'var(--ink)';
  const bg = 'var(--node-bg)';
  return (
    <svg className="edge-sample" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1.7" strokeDasharray={info.dashed ? '6 4' : undefined} />
      {rel === 'er' ? (
        <>
          <EndDecor rel="er" card={sourceCard} x={x1} y={y} ux={1} uy={0} color={color} bg={bg} />
          <EndDecor rel="er" card={targetCard} x={x2} y={y} ux={-1} uy={0} color={color} bg={bg} />
        </>
      ) : (
        <EndDecor rel={rel} x={x2} y={y} ux={-1} uy={0} color={color} bg={bg} />
      )}
    </svg>
  );
}
