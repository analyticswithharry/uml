import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds } from '@xyflow/react';

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const downloadText = (filename, text, mime = 'text/plain') => downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
export const slug = (s) => String(s || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';

/** Renders the diagram (not the surrounding UI) to PNG or SVG at its natural size. */
export async function exportImage(kind, nodes, filename) {
  const el = document.querySelector('.editor-canvas .react-flow__viewport');
  if (!el || !nodes.length) throw new Error('Nothing to export yet. Add something to the canvas first.');
  const b = getNodesBounds(nodes);
  const pad = 48;
  const width = Math.ceil(b.width + pad * 2);
  const height = Math.ceil(b.height + pad * 2);
  const dark = document.documentElement.dataset.theme === 'dark';
  const opts = {
    backgroundColor: dark ? '#0C1226' : '#FFFFFF',
    width, height, pixelRatio: 2,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${-b.x + pad}px, ${-b.y + pad}px) scale(1)` },
    filter: (n) => !(n.classList && (n.classList.contains('react-flow__handle') || n.classList.contains('react-flow__resize-control') || n.classList.contains('ph'))),
  };
  const run = (o) => (kind === 'png' ? toPng(el, o) : toSvg(el, o));
  let url;
  try { url = await run(opts); } catch { url = await run({ ...opts, skipFonts: true }); }
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${kind}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
