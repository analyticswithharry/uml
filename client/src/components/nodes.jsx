import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useStore } from '../store.js';
import { useDoc, useMarks } from '../context.js';

const SIDES = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
];
const Sides = () => SIDES.map(([id, pos]) => <Handle key={id} id={id} type="source" position={pos} className="side-handle" />);

function useNodeApi(id) {
  const { docId, readOnly } = useDoc();
  const mark = useMarks().nodes[id];
  const update = useCallback(
    (patch) => {
      if (!docId) return;
      const s = useStore.getState();
      s.snapshot(docId);
      s.updateNodeData(docId, id, patch);
    },
    [docId, id]
  );
  return { update, readOnly, mark, docId };
}

/** Double-click to edit. Enter saves single-line fields, Ctrl/Cmd+Enter saves multi-line ones, Esc cancels. */
export function EditableText({ value, onCommit, multiline = false, placeholder = '', className = '', render }) {
  const { readOnly } = useDoc();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const done = useRef(false);
  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);

  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (save && draft !== (value || '')) onCommit(draft);
  };

  if (editing) {
    const Tag = multiline ? 'textarea' : 'input';
    return (
      <Tag
        autoFocus
        className={`edit-input nodrag nowheel nopan ${className}`}
        value={draft}
        rows={multiline ? Math.max(2, draft.split('\n').length + 1) : undefined}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          const el = e.target;
          if (multiline) el.setSelectionRange(el.value.length, el.value.length);
          else el.select();
        }}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
        }}
      />
    );
  }
  const empty = !value;
  return (
    <div
      className={`editable ${className} ${empty ? 'is-empty' : ''}`}
      title={readOnly ? undefined : 'Double-click to edit'}
      onDoubleClick={(e) => {
        if (readOnly) return;
        e.stopPropagation();
        done.current = false;
        setEditing(true);
      }}
    >
      {empty ? (readOnly ? null : <span className="ph">{placeholder}</span>) : render ? render(value) : value}
    </div>
  );
}

const cls = (...a) => a.filter(Boolean).join(' ');
const memberLines = (v) => v.split('\n').map((l, i) => <div key={i} className="mline">{l || '\u00A0'}</div>);

export const ClassNode = memo(function ClassNode({ id, data, selected }) {
  const { update, mark } = useNodeApi(id);
  const kind = data.kind || 'class';
  const stereo = { abstract: 'abstract', interface: 'interface', enum: 'enumeration' }[kind];
  return (
    <div className={cls('node cls', `kind-${kind}`, selected && 'is-selected', mark && `mark-${mark}`)}>
      <Sides />
      <div className="cls-head">
        {stereo && <div className="stereo">«{stereo}»</div>}
        <EditableText value={data.label} onCommit={(v) => update({ label: v })} className={cls('cls-name', kind === 'abstract' && 'is-abstract')} placeholder="Name" />
      </div>
      <div className="cls-sec">
        <EditableText multiline value={data.attributes || ''} onCommit={(v) => update({ attributes: v })} className="mono" render={memberLines} placeholder={kind === 'enum' ? 'values, one per line' : 'attributes'} />
      </div>
      {kind !== 'enum' && (
        <div className="cls-sec">
          <EditableText multiline value={data.methods || ''} onCommit={(v) => update({ methods: v })} className="mono" render={memberLines} placeholder="operations" />
        </div>
      )}
    </div>
  );
});

export const ActorNode = memo(function ActorNode({ id, data, selected }) {
  const { update, mark } = useNodeApi(id);
  return (
    <div className={cls('node actor', selected && 'is-selected', mark && `mark-${mark}`)}>
      <Sides />
      <svg width="46" height="64" viewBox="0 0 46 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="23" cy="10" r="8" />
        <path d="M23 18v24M6 28h34M23 42 9 60M23 42l14 18" />
      </svg>
      <EditableText value={data.label} onCommit={(v) => update({ label: v })} className="actor-name" placeholder="Actor" />
    </div>
  );
});

export const UseCaseNode = memo(function UseCaseNode({ id, data, selected }) {
  const { update, mark } = useNodeApi(id);
  return (
    <div className={cls('node usecase', selected && 'is-selected', mark && `mark-${mark}`)}>
      <Sides />
      <EditableText value={data.label} onCommit={(v) => update({ label: v })} className="uc-name" placeholder="Use case" />
    </div>
  );
});

export const BoundaryNode = memo(function BoundaryNode({ id, data, selected }) {
  const { update, readOnly, docId } = useNodeApi(id);
  return (
    <div className={cls('node boundary', selected && 'is-selected')}>
      <NodeResizer
        isVisible={selected && !readOnly}
        minWidth={180}
        minHeight={120}
        onResizeStart={() => docId && useStore.getState().snapshot(docId)}
        lineClassName="resize-line"
        handleClassName="resize-handle"
      />
      <div className="boundary-title">
        <EditableText value={data.label} onCommit={(v) => update({ label: v })} placeholder="System name" />
      </div>
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ id, data, selected }) {
  const { update } = useNodeApi(id);
  return (
    <div className={cls('node note', selected && 'is-selected')}>
      <EditableText multiline value={data.label} onCommit={(v) => update({ label: v })} placeholder="Note" />
    </div>
  );
});

const erRows = (v) =>
  v.split('\n').filter((l) => l.trim()).map((l, i) => {
    const m = l.match(/^\s*(PK|FK|UK)\s+(.*)$/i);
    return (
      <div className="erow" key={i}>
        <span className={cls('key', m && m[1].toLowerCase())}>{m ? m[1].toUpperCase() : ''}</span>
        <span className="mono">{m ? m[2] : l}</span>
      </div>
    );
  });

export const ErEntityNode = memo(function ErEntityNode({ id, data, selected }) {
  const { update, mark } = useNodeApi(id);
  return (
    <div className={cls('node entity', selected && 'is-selected', mark && `mark-${mark}`)}>
      <Sides />
      <div className="ent-head">
        <EditableText value={data.label} onCommit={(v) => update({ label: v })} className="ent-name" placeholder="Entity" />
      </div>
      <div className="ent-body">
        <EditableText multiline value={data.attributes || ''} onCommit={(v) => update({ attributes: v })} render={erRows} placeholder={'PK id: int\nname: varchar'} />
      </div>
    </div>
  );
});

export const nodeTypes = {
  umlClass: ClassNode,
  actor: ActorNode,
  useCase: UseCaseNode,
  boundary: BoundaryNode,
  note: NoteNode,
  erEntity: ErEntityNode,
};
