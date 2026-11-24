import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { EdgeSample } from '../components/Decor.jsx';
import { DIAGRAMS } from '../lib/model.js';

export default function Cheatsheet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('class');
  useEffect(() => { api.get('/api/cheatsheet').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="page"><p className="notice error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>;
  const rels = data.relationships.filter((r) =>
    tab === 'class' ? r.diagram === 'class' : tab === 'usecase' ? ['association', 'generalization', 'include', 'extend'].includes(r.relType) : false
  );

  return (
    <div className="page cheat">
      <header className="page-head">
        <div>
          <h1>Cheatsheet</h1>
          <p className="lede">Notation as this app draws it, with the test that separates look-alikes.</p>
        </div>
      </header>

      <section>
        <h2>Read the scenario like a marker</h2>
        <ol className="steps">
          {data.steps.map((s) => <li key={s.title}><strong>{s.title}</strong><span>{s.body}</span></li>)}
        </ol>
      </section>

      <section>
        <div className="seg" role="tablist" aria-label="Diagram type">
          {Object.entries(DIAGRAMS).map(([k, d]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{d.label}</button>
          ))}
        </div>

        {tab !== 'er' && (
          <table className="notation">
            <thead><tr><th scope="col">Symbol</th><th scope="col">Name</th><th scope="col">Means</th><th scope="col">Remember</th></tr></thead>
            <tbody>
              {rels.map((r) => (
                <tr key={r.relType}>
                  <td><EdgeSample rel={r.relType} /></td>
                  <th scope="row">{r.name}</th>
                  <td>{r.meaning}</td>
                  <td>{r.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'class' && (
          <div className="cols">
            <div>
              <h3>Multiplicity</h3>
              <table className="notation compact"><tbody>{data.multiplicity.map((m) => <tr key={m.symbol}><th scope="row" className="mono">{m.symbol}</th><td>{m.meaning}</td></tr>)}</tbody></table>
            </div>
            <div>
              <h3>Visibility</h3>
              <table className="notation compact"><tbody>{data.visibility.map((m) => <tr key={m.symbol}><th scope="row" className="mono">{m.symbol}</th><td>{m.meaning}</td></tr>)}</tbody></table>
            </div>
            <div>
              <h3>Kinds of box</h3>
              <table className="notation compact"><tbody>{data.classKinds.map((k) => <tr key={k.kind}><th scope="row">{k.name}</th><td>{k.note}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}

        {tab === 'usecase' && (
          <p className="callout">Actors sit outside the system boundary, use cases inside it. Include and extend both use a dashed arrow, but they point in opposite directions: <strong>include</strong> goes from the base to the included use case, <strong>extend</strong> goes from the extension to the base.</p>
        )}

        {tab === 'er' && (
          <>
            <table className="notation">
              <thead><tr><th scope="col">Symbol</th><th scope="col">Crow’s foot</th><th scope="col">Means</th><th scope="col">Reads as</th></tr></thead>
              <tbody>
                {data.cardinality.map((c) => (
                  <tr key={c.card}>
                    <td><EdgeSample rel="er" sourceCard={c.card} targetCard="" /></td>
                    <th scope="row" className="mono">{c.symbol}</th>
                    <td>{c.meaning}</td>
                    <td>{c.read}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="callout">Read each end at the entity it touches. In <span className="mono">Customer ||──o{'{'} Order</span> the symbol beside Order says how many Orders a Customer can have: zero or many. Mark primary keys with <span className="mono">PK</span> and foreign keys with <span className="mono">FK</span> at the start of an attribute line.</p>
          </>
        )}
      </section>

      <section>
        <h2>Traps that cost marks</h2>
        <ul className="traps">{data.traps.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
    </div>
  );
}
