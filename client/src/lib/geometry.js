// Pure geometry used by edges and by the notation samples.

export function nodeBox(n) {
  const w = (n.measured && n.measured.width) || n.width || 160;
  const h = (n.measured && n.measured.height) || n.height || 80;
  const { x, y } = n.internals.positionAbsolute;
  return { cx: x + w / 2, cy: y + h / 2, w, h, ellipse: n.type === 'useCase' };
}

// Point on the node outline, seen from its centre towards (tx, ty).
export function outlinePoint(box, tx, ty) {
  const dx = tx - box.cx;
  const dy = ty - box.cy;
  if (!dx && !dy) return { x: box.cx, y: box.cy };
  const hw = box.w / 2;
  const hh = box.h / 2;
  const k = box.ellipse
    ? 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh))
    : Math.min(hw / Math.max(Math.abs(dx), 1e-9), hh / Math.max(Math.abs(dy), 1e-9));
  return { x: box.cx + dx * k, y: box.cy + dy * k };
}

export function unit(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}
