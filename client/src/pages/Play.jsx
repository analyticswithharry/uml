import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useStore } from '../store.js';
import { DIAGRAMS, toDiagramFile } from '../lib/model.js';
import Editor from '../components/Editor.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import ReadOnlyDiagram from '../components/ReadOnlyDiagram.jsx';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const ICON = { missing: '–', wrong: '✕', extra: '✕' };

function Ring({ value, good }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke={good ? 'var(--ok)' : 'var(--bad)'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 36 36)" />
      <text x="36" y="41" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="17" fill="var(--ink)">{value}</text>
    </svg>
  );
}

export default function Play() {
  const { id } = useParams();
  const docId = `puzzle:${id}`;
  const [puzzle, setPuzzle] = useState(null);
  const [all, setAll] = useState([]);
  const [error, setError] = useState('');
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [solution, setSolution] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const doc = useStore((s) => s.docs[docId]);
  const solved = result && result.correct;
  const solvedRef = useRef(false);
  solvedRef.current = !!solved;

  useEffect(() => {
    setPuzzle(null); setError(''); setHints(0); setResult(null); setSolution(null); setSeconds(0);
    api.get(`/api/puzzles/${id}`).then((p) => { setPuzzle(p); useStore.getState().ensurePuzzleDoc(p); }).catch((e) => setError(e.message));
    api.get('/api/puzzles').then(setAll).catch(() => {});
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => { if (!solvedRef.current) setSeconds((s) => s + 1); }, 1000);
    return () => clearInterval(t);
  }, [id]);

  const marks = useMemo(() => (result && doc && result.rev === doc.rev ? { nodes: result.nodeStatus, edges: result.edgeStatus } : null), [result, doc]);
  const stale = result && doc && result.rev !== doc.rev;
  const next = all.find((p) => puzzle && p.number === puzzle.number + 1);

  const check = async () => {
    if (!doc) return;
    setChecking(true);
    const file = toDiagramFile(doc);
    try {
      const r = await api.post(`/api/puzzles/${id}/check`, { nodes: file.nodes, edges: file.edges });
      setResult({ ...r, rev: doc.rev });
      useStore.getState().recordAttempt(id, r);
      if (r.correct) useStore.getState().toast('Fully correct. Nicely drawn.', 'ok');
    } catch (e) {
      useStore.getState().toast(e.message, 'error');
    }
    setChecking(false);
  };
  const reset = () => {
    if (doc && (doc.past.length || doc.nodes.length !== puzzle.initial.nodes.length) && !window.confirm('Reset the board to the starting point?')) return;
    useStore.getState().resetPuzzleDoc(puzzle);
    setResult(null);
  };
  const showSolution = async () => {
    try { setSolution(await api.get(`/api/puzzles/${id}/solution`)); }
    catch (e) { useStore.getState().toast(e.message, 'error'); }
  };

  if (error) return <div className="page"><p className="notice error">{error}</p><Link className="btn" to="/practice">Back to scenarios</Link></div>;
  if (!puzzle || !doc) return <div className="page"><p className="muted">Loading scenario…</p></div>;

  const extras = (
    <>
      <span className="timer" title="Time on this scenario"><Icon name="timer" size={16} />{mmss(seconds)}</span>
      <button className="btn ghost" onClick={reset}><Icon name="reset" size={16} />Reset</button>
      <button className="btn ghost" onClick={showSolution}><Icon name="eye" size={16} />Solution</button>
      <button className="btn primary" onClick={check} disabled={checking}><Icon name="pen" size={16} />{checking ? 'Marking…' : 'Check my diagram'}</button>
    </>
  );

  return (
    <div className="play">
      <aside className="brief">
        <Link to="/practice" className="back">All scenarios</Link>
        <h1>{puzzle.title}</h1>
        <div className="puzzle-tags">
          <span className="tag">{DIAGRAMS[puzzle.diagramType].label.replace(' diagram', '')}</span>
          <span className={`tag lvl-${puzzle.difficulty.toLowerCase()}`}>{puzzle.difficulty}</span>
          <span className="tag plain">{puzzle.mode === 'build' ? 'Connect the boxes' : 'Draw from the text'}</span>
        </div>

        <h2>Scenario</h2>
        <p className="scenario">{puzzle.scenario}</p>
        <h2>Your task</h2>
        <p>{puzzle.goal}</p>

        <div className="hint-box">
          <div className="hint-head"><Icon name="bulb" size={16} /><strong>Hints</strong><span className="muted small">{hints} of {puzzle.hints.length}</span></div>
          {puzzle.hints.slice(0, hints).map((h, i) => <p key={i} className="hint">{h}</p>)}
          {hints < puzzle.hints.length && <button className="btn ghost" onClick={() => setHints(hints + 1)}>{hints ? 'Next hint' : 'Show a hint'}</button>}
        </div>

        {result && (
          <section className={`result ${result.correct ? 'good' : ''}`} aria-live="polite">
            <div className="result-head">
              <Ring value={result.score} good={result.correct} />
              <div>
                <strong>{result.summary}</strong>
                <span className="muted small">{result.counts.nodes.found}/{result.counts.nodes.total} elements · {result.counts.edges.ok}/{result.counts.edges.total} lines right{result.counts.extras ? ` · ${result.counts.extras} extra` : ''}</span>
              </div>
            </div>
            {stale && <p className="notice">You have changed the board since this check. Press Check again to refresh the marks.</p>}
            {result.diagnostics.length > 0 && (
              <ul className="diag">
                {result.diagnostics.map((d, i) => <li key={i} className={d.kind}><span aria-hidden="true">{ICON[d.kind]}</span>{d.message}</li>)}
              </ul>
            )}
            {result.tips.length > 0 && (
              <>
                <h3>Worth adding</h3>
                <ul className="diag tips">{result.tips.map((t, i) => <li key={i} className="tip"><span aria-hidden="true">+</span>{t}</li>)}</ul>
              </>
            )}
            {result.correct && (
              <div className="btn-row">
                {next ? <Link className="btn primary" to={`/practice/${next.id}`}>Next scenario</Link> : <Link className="btn primary" to="/practice">Back to scenarios</Link>}
                <button className="btn" onClick={showSolution}>See why it works</button>
              </div>
            )}
          </section>
        )}
      </aside>

      <div className="play-editor">
        <Editor key={docId} docId={docId} marks={marks} extras={extras} />
      </div>

      {solution && (
        <Modal title={`Solution: ${puzzle.title}`} onClose={() => setSolution(null)} wide>
          <p>{solution.explanation}</p>
          <ReadOnlyDiagram nodes={solution.diagram.nodes} edges={solution.diagram.edges} />
        </Modal>
      )}
    </div>
  );
}
