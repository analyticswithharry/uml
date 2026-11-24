import { useRef, useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { autoLayout } from '../lib/layout.js';

const SAMPLE_API = JSON.stringify({
  openapi: '3.0.0', info: { title: 'Pet Shop', version: '1' }, paths: {},
  components: { schemas: {
    Pet: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'integer', format: 'int64' }, name: { type: 'string' }, owner: { $ref: '#/components/schemas/Owner' }, tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } }, status: { $ref: '#/components/schemas/Status' } } },
    Dog: { allOf: [{ $ref: '#/components/schemas/Pet' }, { type: 'object', properties: { breed: { type: 'string' } } }] },
    Owner: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
    Tag: { type: 'object', properties: { label: { type: 'string' } } },
    Status: { type: 'string', enum: ['available', 'sold'] },
  } },
}, null, 2);

const SAMPLE_CODE = `public abstract class Account implements Auditable {
    private String id;
    protected double balance;
    private List<Transaction> history;
    public abstract double fee();
    public void deposit(double amount) { }
}
interface Auditable { void audit(); }
class Savings extends Account {
    private double rate;
    public double fee() { return 0; }
}
class Transaction { private double amount; }`;

export default function ImportDialog({ onClose, onCreated }) {
  const [tab, setTab] = useState('openapi');
  const [text, setText] = useState('');
  const [lang, setLang] = useState('auto');
  const [endpoints, setEndpoints] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const { createDoc, loadWorkspace, toast } = useStore.getState();

  const readFile = async (e, intoText) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const content = await f.text();
    if (intoText) { setText(content); setError(''); return; }
    try {
      const json = JSON.parse(content);
      if (json.app === 'redpen-uml-workspace') {
        const n = loadWorkspace(json);
        toast(`Loaded ${n} diagram${n === 1 ? '' : 's'}`, 'ok');
        onClose();
        return;
      }
      if (!json.type || !Array.isArray(json.nodes) || !Array.isArray(json.edges)) throw new Error('missing type, nodes or edges');
      const id = createDoc({ type: json.type, title: json.title || f.name.replace(/\.json$/i, ''), nodes: json.nodes, edges: json.edges });
      onCreated(id);
    } catch (err) {
      setError(`That file is not a Redpen diagram or workspace (${err.message}).`);
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const r = tab === 'openapi'
        ? await api.post('/api/import/openapi', { text, includeEndpoints: endpoints })
        : await api.post('/api/import/code', { text, language: lang });
      const nodes = autoLayout(r.nodes, r.edges, 'class');
      const id = createDoc({ type: 'class', title: tab === 'openapi' ? 'API model' : 'Imported classes', nodes, edges: r.edges });
      toast(`${r.nodes.length} classes imported`, 'ok');
      onCreated(id);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <Modal title="Import" onClose={onClose} wide>
      <div className="seg" role="tablist">
        {[['openapi', 'OpenAPI / Swagger'], ['code', 'Source code'], ['file', 'Saved file']].map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'on' : ''} onClick={() => { setTab(v); setError(''); setText(''); }}>{l}</button>
        ))}
      </div>

      {tab === 'file' ? (
        <div className="import-file">
          <p>Open a diagram exported from Redpen (<code>.json</code>), or a whole workspace saved from the top bar.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => readFile(e, false)} />
          <button className="btn primary" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Choose file</button>
        </div>
      ) : (
        <>
          <p className="muted">
            {tab === 'openapi'
              ? 'Every schema becomes a class. $ref properties become associations and allOf becomes inheritance. Paste JSON, or YAML if the server has it installed.'
              : 'Paste Java, TypeScript or PHP. Classes, interfaces, enums, members, extends/implements and typed fields are turned into a class diagram.'}
          </p>
          <textarea className="code-box mono" rows={13} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder={tab === 'openapi' ? '{ "openapi": "3.0.0", "components": { "schemas": { … } } }' : 'public class Example { … }'} />
          <div className="btn-row spread">
            <div className="btn-row">
              <input type="file" id="imp-file" hidden accept={tab === 'openapi' ? '.json,.yaml,.yml' : '.java,.ts,.tsx,.php,.txt'} onChange={(e) => readFile(e, true)} />
              <label htmlFor="imp-file" className="btn"><Icon name="upload" size={16} />Load file</label>
              <button className="btn ghost" onClick={() => { setText(tab === 'openapi' ? SAMPLE_API : SAMPLE_CODE); setError(''); }}>Use a sample</button>
            </div>
            <div className="btn-row">
              {tab === 'openapi' ? (
                <label className="check"><input type="checkbox" checked={endpoints} onChange={(e) => setEndpoints(e.target.checked)} />Include endpoints</label>
              ) : (
                <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
                  <option value="auto">Detect language</option><option value="java">Java</option><option value="ts">TypeScript</option><option value="php">PHP</option>
                </select>
              )}
              <button className="btn primary" onClick={run} disabled={busy || !text.trim()}>{busy ? 'Working…' : 'Create class diagram'}</button>
            </div>
          </div>
        </>
      )}
      {error && <p className="notice error" role="alert">{error}</p>}
    </Modal>
  );
}
