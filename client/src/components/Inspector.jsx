import { useStore } from '../store.js';
import { CARDS, DIAGRAMS, REL } from '../lib/model.js';
import Icon from './Icon.jsx';

const KINDS = [['class', 'Class'], ['abstract', 'Abstract class'], ['interface', 'Interface'], ['enum', 'Enumeration']];
const MULTS = ['1', '0..1', '*', '1..*', '0..*'];

export default function Inspector({ docId, doc }) {
  const st = useStore.getState();
  const selN = doc.nodes.filter((n) => n.selected);
  const selE = doc.edges.filter((e) => e.selected);

  const nameOf = (id) => (doc.nodes.find((n) => n.id === id)?.data.label) || '?';
  const keepHistory = () => useStore.getState().snapshot(docId);
  const setNode = (id, patch) => useStore.getState().updateNodeData(docId, id, patch);
  const setEdge = (id, patch) => useStore.getState().updateEdgeData(docId, id, patch);

  if (selE.length === 1 && !selN.length) {
    const e = selE[0];
    const d = e.data || {};
    const rel = d.relType || 'association';
    const options = DIAGRAMS[doc.type].relations;
    const multi = rel !== 'er' && !['generalization', 'realization', 'include', 'extend'].includes(rel);
    return (
      <aside className="inspector" aria-label="Line properties">
        <h3>Line</h3>
        <p className="route"><strong>{nameOf(e.source)}</strong><Icon name="chevron" size={14} /><strong>{nameOf(e.target)}</strong></p>

        {options.length > 1 && (
          <label className="field">
            <span>Type</span>
            <select value={rel} onChange={(ev) => { keepHistory(); setEdge(e.id, { relType: ev.target.value }); }}>
              {options.map((r) => <option key={r} value={r}>{REL[r].label}</option>)}
            </select>
          </label>
        )}
        <p className="muted small">{REL[rel]?.hint}</p>

        <label className="field">
          <span>Label</span>
          <input value={d.label || ''} placeholder={rel === 'include' || rel === 'extend' ? 'Shown as «' + rel + '» if empty' : 'e.g. places, enrols in'} onFocus={keepHistory} onChange={(ev) => setEdge(e.id, { label: ev.target.value })} />
        </label>

        {multi && (
          <div className="field-row">
            <label className="field">
              <span>Near {nameOf(e.source)}</span>
              <input list="mults" value={d.sourceMult || ''} placeholder="1" onFocus={keepHistory} onChange={(ev) => setEdge(e.id, { sourceMult: ev.target.value })} />
            </label>
            <label className="field">
              <span>Near {nameOf(e.target)}</span>
              <input list="mults" value={d.targetMult || ''} placeholder="*" onFocus={keepHistory} onChange={(ev) => setEdge(e.id, { targetMult: ev.target.value })} />
            </label>
            <datalist id="mults">{MULTS.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
        )}

        {rel === 'er' && (
          <>
            {[['sourceCard', e.source], ['targetCard', e.target]].map(([key, nodeId]) => (
              <label className="field" key={key}>
                <span>At {nameOf(nodeId)}: how many?</span>
                <select value={d[key] || 'one_only'} onChange={(ev) => { keepHistory(); setEdge(e.id, { [key]: ev.target.value }); }}>
                  {Object.entries(CARDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            ))}
          </>
        )}

        <div className="btn-row">
          <button className="btn" onClick={() => st.swapEdge(docId, e.id)}><Icon name="swap" size={16} />Reverse direction</button>
          <button className="btn danger" onClick={() => useStore.getState().deleteSelected(docId)}><Icon name="trash" size={16} />Delete</button>
        </div>
      </aside>
    );
  }

  if (selN.length === 1 && !selE.length) {
    const n = selN[0];
    const d = n.data;
    return (
      <aside className="inspector" aria-label="Element properties">
        <h3>{{ umlClass: 'Class', actor: 'Actor', useCase: 'Use case', boundary: 'System boundary', erEntity: 'Entity', note: 'Note' }[n.type]}</h3>
        <label className="field">
          <span>{n.type === 'note' ? 'Text' : 'Name'}</span>
          {n.type === 'note' ? (
            <textarea rows={3} value={d.label || ''} onFocus={keepHistory} onChange={(ev) => setNode(n.id, { label: ev.target.value })} />
          ) : (
            <input value={d.label || ''} onFocus={keepHistory} onChange={(ev) => setNode(n.id, { label: ev.target.value })} />
          )}
        </label>
        {n.type === 'umlClass' && (
          <>
            <label className="field">
              <span>Kind</span>
              <select value={d.kind || 'class'} onChange={(ev) => { keepHistory(); setNode(n.id, { kind: ev.target.value }); }}>
                {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{d.kind === 'enum' ? 'Values' : 'Attributes'} <em>(one per line)</em></span>
              <textarea className="mono" rows={4} spellCheck={false} value={d.attributes || ''} onFocus={keepHistory} onChange={(ev) => setNode(n.id, { attributes: ev.target.value })} />
            </label>
            {d.kind !== 'enum' && (
              <label className="field">
                <span>Operations <em>(one per line)</em></span>
                <textarea className="mono" rows={4} spellCheck={false} value={d.methods || ''} onFocus={keepHistory} onChange={(ev) => setNode(n.id, { methods: ev.target.value })} />
              </label>
            )}
            <p className="muted small">Visibility: <code>+</code> public, <code>-</code> private, <code>#</code> protected, <code>~</code> package.</p>
          </>
        )}
        {n.type === 'erEntity' && (
          <label className="field">
            <span>Attributes <em>(start a line with PK or FK for keys)</em></span>
            <textarea className="mono" rows={6} spellCheck={false} value={d.attributes || ''} onFocus={keepHistory} onChange={(ev) => setNode(n.id, { attributes: ev.target.value })} />
          </label>
        )}
        <div className="btn-row">
          {n.type !== 'boundary' && <button className="btn" onClick={() => st.duplicateSelected(docId)}><Icon name="copy" size={16} />Duplicate</button>}
          <button className="btn danger" onClick={() => useStore.getState().deleteSelected(docId)}><Icon name="trash" size={16} />Delete</button>
        </div>
      </aside>
    );
  }

  if (selN.length + selE.length > 1) {
    return (
      <aside className="inspector" aria-label="Selection">
        <h3>{selN.length + selE.length} selected</h3>
        <div className="btn-row">
          <button className="btn" onClick={() => st.duplicateSelected(docId)}><Icon name="copy" size={16} />Duplicate</button>
          <button className="btn danger" onClick={() => useStore.getState().deleteSelected(docId)}><Icon name="trash" size={16} />Delete</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Tips">
      <h3>Quick reference</h3>
      <dl className="keys">
        <dt>Double-click</dt><dd>Edit text on a box</dd>
        <dt>Drag the dot</dt><dd>Draw a line to another box</dd>
        <dt>Click a line</dt><dd>Change its type or direction</dd>
        <dt>Ctrl/⌘ Z</dt><dd>Undo (add Shift to redo)</dd>
        <dt>Ctrl/⌘ D</dt><dd>Duplicate selection</dd>
        <dt>Delete</dt><dd>Remove selection</dd>
        <dt>Shift + drag</dt><dd>Select several</dd>
      </dl>
      <p className="muted small">Your work lives in this browser tab only. Refreshing the page clears it. Use <strong>Save workspace</strong> in the top bar to keep a copy.</p>
    </aside>
  );
}
