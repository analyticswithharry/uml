import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { DIAGRAMS } from '../lib/model.js';

export default function NewDiagramDialog({ onClose, onCreated, initialType = 'class' }) {
  const [type, setType] = useState(initialType);
  const [templates, setTemplates] = useState([]);
  const [tpl, setTpl] = useState('blank');
  const [title, setTitle] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/api/templates').then(setTemplates).catch((e) => setErr(e.message)); }, []);
  useEffect(() => setTpl('blank'), [type]);

  const create = async () => {
    let nodes = [];
    let edges = [];
    let name = title.trim() || `${DIAGRAMS[type].label} ${useStore.getState().order.length + 1}`;
    if (tpl !== 'blank') {
      try {
        const t = await api.get(`/api/templates/${tpl}`);
        nodes = JSON.parse(JSON.stringify(t.diagram.nodes));
        edges = JSON.parse(JSON.stringify(t.diagram.edges));
        if (!title.trim()) name = t.title;
      } catch (e) { setErr(e.message); return; }
    }
    onCreated(useStore.getState().createDoc({ type, title: name, nodes, edges }));
  };

  const list = templates.filter((t) => t.diagramType === type);
  return (
    <Modal title="New diagram" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={create}>Create diagram</button></>}>
      <div className="type-pick" role="radiogroup" aria-label="Diagram type">
        {Object.entries(DIAGRAMS).map(([k, d]) => (
          <button key={k} role="radio" aria-checked={type === k} className={`type-opt ${type === k ? 'on' : ''}`} onClick={() => setType(k)}>
            <strong>{d.label}</strong>
            <span>{d.blurb}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${DIAGRAMS[type].label}`} onKeyDown={(e) => e.key === 'Enter' && create()} />
      </label>

      <fieldset className="tpl-list">
        <legend>Start from</legend>
        <label className={`tpl ${tpl === 'blank' ? 'on' : ''}`}>
          <input type="radio" name="tpl" checked={tpl === 'blank'} onChange={() => setTpl('blank')} />
          <span><strong>Blank board</strong><em>Start from nothing, like in the exam.</em></span>
        </label>
        {list.map((t) => (
          <label key={t.id} className={`tpl ${tpl === t.id ? 'on' : ''}`}>
            <input type="radio" name="tpl" checked={tpl === t.id} onChange={() => setTpl(t.id)} />
            <span><strong>{t.title}</strong><em>{t.description}</em></span>
          </label>
        ))}
      </fieldset>
      {err && <p className="notice error">{err}</p>}
    </Modal>
  );
}
