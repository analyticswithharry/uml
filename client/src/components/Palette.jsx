import { DIAGRAMS, REL } from '../lib/model.js';
import { EdgeSample } from './Decor.jsx';

function Glyph({ item }) {
  const p = { width: 34, height: 26, viewBox: '0 0 34 26', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (item.type) {
    case 'umlClass':
      return (
        <svg {...p}>
          <rect x="4" y="2" width="26" height="22" rx="2" strokeDasharray={item.kind === 'interface' ? '3 2' : undefined} />
          <path d="M4 9h26" />
          {item.kind !== 'enum' && <path d="M4 16h26" />}
          {item.kind === 'abstract' && <path d="M11 6h12" strokeWidth="1" />}
        </svg>
      );
    case 'actor':
      return <svg {...p}><circle cx="17" cy="6" r="3.5" /><path d="M17 10v8M10 13h14M17 18l-5 6M17 18l5 6" /></svg>;
    case 'useCase':
      return <svg {...p}><ellipse cx="17" cy="13" rx="14" ry="9" /></svg>;
    case 'boundary':
      return <svg {...p}><rect x="3" y="2" width="28" height="22" rx="2" strokeDasharray="4 3" /><path d="M10 6h14" /></svg>;
    case 'erEntity':
      return <svg {...p}><rect x="4" y="2" width="26" height="22" rx="2" /><path d="M4 9h26M12 9v15" /></svg>;
    default:
      return <svg {...p}><path d="M5 3h18l6 6v14H5z" /><path d="M23 3v6h6" /></svg>;
  }
}

export default function Palette({ type, rel, onRel, onAdd }) {
  const def = DIAGRAMS[type];
  return (
    <aside className="palette" aria-label="Elements">
      <h3>Add to the canvas</h3>
      <p className="muted small">Click to add, or drag onto the board.</p>
      <div className="pal-list">
        {def.palette.map((item) => (
          <button
            key={item.id}
            className="pal-item"
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('application/redpen', JSON.stringify(item)); e.dataTransfer.effectAllowed = 'move'; }}
            onClick={() => onAdd(item)}
          >
            <Glyph item={item} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {def.relations.length > 1 ? (
        <>
          <h3>Next line you draw</h3>
          <p className="muted small">Pick a type, then drag from the dot on one box’s edge to another box.</p>
          <div className="rel-list" role="radiogroup" aria-label="Line type">
            {def.relations.map((r) => (
              <button key={r} role="radio" aria-checked={rel === r} className={`rel-item ${rel === r ? 'on' : ''}`} onClick={() => onRel(r)} title={REL[r].hint}>
                <EdgeSample rel={r} width={96} height={26} />
                <span>{REL[r].label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3>Connect entities</h3>
          <p className="muted small">Drag from the dot on one entity’s edge to another. Set the crow’s foot at each end in the right panel.</p>
        </>
      )}
    </aside>
  );
}
