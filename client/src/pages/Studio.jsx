import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { DIAGRAMS } from '../lib/model.js';
import Editor from '../components/Editor.jsx';
import Icon from '../components/Icon.jsx';
import NewDiagramDialog from '../components/NewDiagramDialog.jsx';
import ImportDialog from '../components/ImportDialog.jsx';
import ExportDialog from '../components/ExportDialog.jsx';

export default function Studio() {
  const order = useStore((s) => s.order);
  const docs = useStore((s) => s.docs);
  const activeId = useStore((s) => s.activeId);
  const [dialog, setDialog] = useState(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get('new')) { setDialog('new'); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const current = order.includes(activeId) ? activeId : order[0];
  const doc = current && docs[current];
  const created = (id) => { setDialog(null); useStore.getState().openDoc(id); navigate('/studio'); };

  const close = (id) => {
    const d = docs[id];
    if (d.nodes.length && !window.confirm(`Close “${d.title}”? It is only stored in this tab, so it will be gone.`)) return;
    useStore.getState().closeDoc(id);
  };

  const extras = doc ? (
    <>
      <button className="btn ghost" onClick={() => setDialog('import')}><Icon name="upload" size={16} />Import</button>
      <button className="btn primary" onClick={() => setDialog('export')}><Icon name="download" size={16} />Export</button>
    </>
  ) : null;

  return (
    <div className="studio">
      <div className="tabs" role="tablist" aria-label="Open diagrams">
        {order.map((id) => (
          <div key={id} role="presentation" className={`tab ${id === current ? 'on' : ''}`}>
            <button role="tab" aria-selected={id === current} className="tab-main" onClick={() => useStore.getState().openDoc(id)}>
              <span className="tab-type">{DIAGRAMS[docs[id].type].label.replace(' diagram', '')}</span>
              {id === current ? (
                <input className="tab-title" value={docs[id].title} aria-label="Diagram name" onChange={(e) => useStore.getState().renameDoc(id, e.target.value)} onClick={(e) => e.stopPropagation()} size={Math.max(8, docs[id].title.length)} />
              ) : (
                <span>{docs[id].title}</span>
              )}
            </button>
            <button className="icon-btn tiny" onClick={() => close(id)} aria-label={`Close ${docs[id].title}`}><Icon name="close" size={14} /></button>
          </div>
        ))}
        <button className="btn ghost new-tab" onClick={() => setDialog('new')}><Icon name="plus" size={16} />New diagram</button>
        {!doc && <button className="btn ghost" onClick={() => setDialog('import')}><Icon name="upload" size={16} />Import</button>}
      </div>

      {doc ? (
        <div className="studio-editor"><Editor key={current} docId={current} extras={extras} /></div>
      ) : (
        <div className="studio-empty">
          <h1>No diagram open</h1>
          <p>Start from a blank board or a template, or turn an OpenAPI file or some source code into a class diagram. Everything stays in this tab until you refresh.</p>
          <div className="hero-cta">
            <button className="btn primary lg" onClick={() => setDialog('new')}>New diagram</button>
            <button className="btn lg" onClick={() => setDialog('import')}>Import</button>
          </div>
        </div>
      )}

      {dialog === 'new' && <NewDiagramDialog onClose={() => setDialog(null)} onCreated={created} />}
      {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onCreated={created} />}
      {dialog === 'export' && doc && <ExportDialog doc={doc} onClose={() => setDialog(null)} />}
    </div>
  );
}
