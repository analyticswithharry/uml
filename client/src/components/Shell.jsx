import { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useStore } from '../store.js';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { downloadText } from '../lib/files.js';

function SessionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const fileRef = useRef(null);
  const count = useStore((s) => s.order.length);
  const attempts = useStore((s) => Object.keys(s.progress).length);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const save = () => {
    const s = useStore.getState();
    downloadText('redpen-workspace.json', JSON.stringify(s.workspaceFile(), null, 2), 'application/json');
    s.toast('Workspace downloaded', 'ok');
    setOpen(false);
  };
  const load = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const s = useStore.getState();
    try {
      const json = JSON.parse(await f.text());
      if (json.app !== 'redpen-uml-workspace') throw new Error('not a workspace file');
      const n = s.loadWorkspace(json);
      s.toast(`Loaded ${n} diagram${n === 1 ? '' : 's'}`, 'ok');
    } catch (err) {
      s.toast(`Could not load that file: ${err.message}`, 'error');
    }
    setOpen(false);
  };

  return (
    <div className="session" ref={ref}>
      <button className="btn ghost session-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">
        <span className="dot" aria-hidden="true" />
        <span className="session-label">Memory only</span>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Session">
          <p><strong>Nothing is saved on a server.</strong> Your diagrams ({count}) and practice progress ({attempts} scenario{attempts === 1 ? '' : 's'} tried) live in this tab. Refresh and they are gone.</p>
          <div className="btn-row">
            <button className="btn primary" onClick={save}><Icon name="save" size={16} />Save workspace</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={load} />
            <button className="btn" onClick={() => fileRef.current.click()}><Icon name="upload" size={16} />Load workspace</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const toasts = useStore((s) => s.toasts);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Redpen UML home"><Logo /><span>Redpen UML</span></Link>
        <nav aria-label="Main">
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/cheatsheet">Cheatsheet</NavLink>
        </nav>
        <div className="top-actions">
          <SessionMenu />
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>
      <main>{children}</main>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>)}
      </div>
    </div>
  );
}
