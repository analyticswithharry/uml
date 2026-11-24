import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { DIAGRAMS } from '../lib/model.js';
import Icon from '../components/Icon.jsx';

const LEVELS = ['Beginner', 'Easy', 'Intermediate', 'Advanced'];

export default function Practice() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');
  const [level, setLevel] = useState('all');
  const progress = useStore((s) => s.progress);

  useEffect(() => { api.get('/api/puzzles').then(setList).catch((e) => setError(e.message)); }, []);

  const shown = useMemo(() => (list || []).filter((p) => (type === 'all' || p.diagramType === type) && (level === 'all' || p.difficulty === level)), [list, type, level]);
  const solved = list ? list.filter((p) => progress[p.id] && progress[p.id].solved).length : 0;

  return (
    <div className="page practice">
      <header className="page-head">
        <div>
          <h1>Practice scenarios</h1>
          <p className="lede">Pick one, draw it, press Check. The marker explains every mistake.</p>
        </div>
        {list && <div className="tally" aria-label="Progress"><strong>{solved}</strong> of {list.length} solved this session</div>}
      </header>

      <div className="filters">
        <div className="seg" role="radiogroup" aria-label="Diagram type">
          {[['all', 'All'], ...Object.entries(DIAGRAMS).map(([k, d]) => [k, d.label.replace(' diagram', '')])].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={type === v} className={type === v ? 'on' : ''} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Difficulty">
          {['all', ...LEVELS].map((v) => (
            <button key={v} role="radio" aria-checked={level === v} className={level === v ? 'on' : ''} onClick={() => setLevel(v)}>{v === 'all' ? 'Any level' : v}</button>
          ))}
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}
      {!list && !error && <p className="muted">Loading scenarios…</p>}

      <ul className="puzzle-list">
        {shown.map((p) => {
          const pr = progress[p.id];
          return (
            <li key={p.id}>
              <Link to={`/practice/${p.id}`} className="puzzle-row">
                <div className="puzzle-main">
                  <h2>{p.title}</h2>
                  <p>{p.goal}</p>
                </div>
                <div className="puzzle-tags">
                  <span className="tag">{DIAGRAMS[p.diagramType].label.replace(' diagram', '')}</span>
                  <span className={`tag lvl-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                  <span className="tag plain">{p.mode === 'build' ? 'Connect the boxes' : 'Draw from the text'}</span>
                </div>
                <div className="puzzle-status">
                  {pr && pr.solved ? <span className="status ok"><Icon name="check" size={16} />Solved</span> : pr ? <span className="status">Best {pr.best}%</span> : <span className="status quiet">Not tried</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {list && !shown.length && <p className="muted">No scenarios match these filters.</p>}
    </div>
  );
}
