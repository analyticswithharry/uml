import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { toDiagramFile } from '../lib/model.js';
import { downloadText, exportImage, slug } from '../lib/files.js';

export default function ExportDialog({ doc, onClose }) {
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState('');
  const [format, setFormat] = useState('plantuml');
  const [code, setCode] = useState({ text: '', error: '', loading: false });
  const file = slug(doc.title);

  useEffect(() => {
    let live = true;
    setCode({ text: '', error: '', loading: true });
    const d = toDiagramFile(doc);
    api.post(`/api/export/${format}`, { type: doc.type, nodes: d.nodes, edges: d.edges })
      .then((r) => live && setCode({ text: r.text, error: '', loading: false }))
      .catch((e) => live && setCode({ text: '', error: e.message, loading: false }));
    return () => { live = false; };
  }, [format, doc]);

  const image = async (kind) => {
    setBusy(kind);
    try { await exportImage(kind, doc.nodes, file); toast(`${kind.toUpperCase()} downloaded`, 'ok'); }
    catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(code.text); toast('Copied to clipboard', 'ok'); }
    catch { toast('Copy failed. Select the text and copy it manually.', 'error'); }
  };

  return (
    <Modal title="Export" onClose={onClose} wide>
      <section className="export-section">
        <h3>Picture</h3>
        <p className="muted">Exports the diagram only, cropped to its content.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => image('png')} disabled={!!busy}><Icon name="download" size={16} />{busy === 'png' ? 'Rendering…' : 'PNG'}</button>
          <button className="btn" onClick={() => image('svg')} disabled={!!busy}><Icon name="download" size={16} />{busy === 'svg' ? 'Rendering…' : 'SVG'}</button>
        </div>
      </section>

      <section className="export-section">
        <h3>Diagram code</h3>
        <div className="seg" role="radiogroup" aria-label="Code format">
          {[['plantuml', 'PlantUML'], ['mermaid', 'Mermaid']].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={format === v} className={format === v ? 'on' : ''} onClick={() => setFormat(v)}>{l}</button>
          ))}
        </div>
        {code.error ? <p className="notice error">{code.error}</p> : (
          <textarea className="code-box mono" readOnly spellCheck={false} value={code.loading ? 'Generating…' : code.text} rows={11} />
        )}
        <div className="btn-row">
          <button className="btn" onClick={copy} disabled={!code.text}><Icon name="copy" size={16} />Copy</button>
          <button className="btn" onClick={() => downloadText(`${file}.${format === 'plantuml' ? 'puml' : 'mmd'}`, code.text)} disabled={!code.text}><Icon name="download" size={16} />Download</button>
        </div>
        <p className="muted small">{format === 'plantuml' ? 'Paste into plantuml.com or any PlantUML renderer.' : 'Paste into mermaid.live or any Mermaid renderer.'}</p>
      </section>

      <section className="export-section">
        <h3>Editable file</h3>
        <p className="muted">Reopen it later with Import → File.</p>
        <div className="btn-row">
          <button className="btn" onClick={() => downloadText(`${file}.json`, JSON.stringify(toDiagramFile(doc), null, 2), 'application/json')}><Icon name="download" size={16} />JSON</button>
        </div>
      </section>
    </Modal>
  );
}
