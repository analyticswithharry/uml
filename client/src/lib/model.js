// Single source of truth for what each diagram type offers.

export const uid = (p = 'n') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const REL = {
  association: { label: 'Association', hint: 'Plain line: "knows about" or "uses".', dashed: false },
  aggregation: { label: 'Aggregation', hint: 'Whole–part, part can live alone. Diamond on the whole.', dashed: false },
  composition: { label: 'Composition', hint: 'Whole–part, part dies with the whole. Filled diamond on the whole.', dashed: false },
  generalization: { label: 'Generalization', hint: 'Inheritance. Draw from child to parent.', dashed: false },
  realization: { label: 'Realization', hint: 'Implements an interface. Draw from class to interface.', dashed: true },
  dependency: { label: 'Dependency', hint: 'Temporary use. Dashed arrow to the used class.', dashed: true },
  include: { label: 'Include', hint: 'Always runs. Draw from base to included.', dashed: true },
  extend: { label: 'Extend', hint: 'Sometimes runs. Draw from extension to base.', dashed: true },
  er: { label: 'Relationship', hint: 'Crow’s foot relationship between entities.', dashed: false },
};

export const CARDS = {
  one_only: 'Exactly one',
  zero_or_one: 'Zero or one',
  one_or_many: 'One or many',
  zero_or_many: 'Zero or many',
};

export const DIAGRAMS = {
  class: {
    label: 'Class diagram',
    blurb: 'Classes, interfaces, inheritance and whole–part links.',
    relations: ['association', 'aggregation', 'composition', 'generalization', 'realization', 'dependency'],
    palette: [
      { id: 'class', type: 'umlClass', kind: 'class', label: 'Class' },
      { id: 'abstract', type: 'umlClass', kind: 'abstract', label: 'Abstract class' },
      { id: 'interface', type: 'umlClass', kind: 'interface', label: 'Interface' },
      { id: 'enum', type: 'umlClass', kind: 'enum', label: 'Enumeration' },
      { id: 'note', type: 'note', label: 'Note' },
    ],
  },
  usecase: {
    label: 'Use case diagram',
    blurb: 'Actors, use cases, include and extend.',
    relations: ['association', 'include', 'extend', 'generalization'],
    palette: [
      { id: 'actor', type: 'actor', label: 'Actor' },
      { id: 'useCase', type: 'useCase', label: 'Use case' },
      { id: 'boundary', type: 'boundary', label: 'System boundary' },
      { id: 'note', type: 'note', label: 'Note' },
    ],
  },
  er: {
    label: 'ER diagram',
    blurb: 'Entities, keys and crow’s foot cardinalities.',
    relations: ['er'],
    palette: [
      { id: 'entity', type: 'erEntity', label: 'Entity' },
      { id: 'note', type: 'note', label: 'Note' },
    ],
  },
};

export function makeNode(item, position) {
  const id = uid('n');
  const base = { id, position, data: {} };
  switch (item.type) {
    case 'umlClass': {
      const names = { class: 'ClassName', abstract: 'AbstractClass', interface: 'InterfaceName', enum: 'EnumName' };
      return {
        ...base, type: 'umlClass',
        data: {
          label: names[item.kind], kind: item.kind,
          attributes: item.kind === 'enum' ? 'VALUE_ONE\nVALUE_TWO' : item.kind === 'interface' ? '' : '- attribute: Type',
          methods: item.kind === 'enum' ? '' : '+ operation(): void',
        },
      };
    }
    case 'actor': return { ...base, type: 'actor', data: { label: 'Actor' } };
    case 'useCase': return { ...base, type: 'useCase', data: { label: 'Use case' } };
    case 'boundary': return { ...base, type: 'boundary', width: 360, height: 280, zIndex: -1, data: { label: 'System' } };
    case 'erEntity': return { ...base, type: 'erEntity', data: { label: 'Entity', attributes: 'PK id: int\nname: varchar' } };
    default: return { ...base, type: 'note', data: { label: 'Note: double-click to edit' } };
  }
}

export function makeEdge(source, target, relType) {
  return {
    id: uid('e'), source, target, type: 'uml',
    data: relType === 'er'
      ? { relType, label: '', sourceCard: 'one_only', targetCard: 'zero_or_many' }
      : { relType, label: '', sourceMult: '', targetMult: '' },
  };
}

export function estimateSize(n) {
  if (n.measured && n.measured.width) return { w: n.measured.width, h: n.measured.height };
  if (n.width && n.height) return { w: n.width, h: n.height };
  const lines = (s) => String(s || '').split('\n').filter(Boolean);
  const longest = (arr) => arr.reduce((m, l) => Math.max(m, l.length), 0);
  if (n.type === 'umlClass') {
    const a = lines(n.data.attributes);
    const m = lines(n.data.methods);
    return { w: Math.max(190, longest([n.data.label || '', ...a, ...m]) * 7.6 + 32), h: 46 + Math.max(1, a.length) * 19 + (n.data.kind === 'enum' ? 0 : Math.max(1, m.length) * 19) + 12 };
  }
  if (n.type === 'erEntity') {
    const a = lines(n.data.attributes);
    return { w: Math.max(190, longest([n.data.label || '', ...a]) * 7.6 + 56), h: 42 + Math.max(1, a.length) * 22 + 10 };
  }
  if (n.type === 'actor') return { w: 90, h: 110 };
  if (n.type === 'useCase') return { w: Math.max(150, (n.data.label || '').length * 8 + 44), h: 62 };
  return { w: 160, h: 80 };
}

// What the "minimal diagram" file looks like when saved or loaded.
export function toDiagramFile(doc) {
  return { app: 'redpen-uml', version: 1, type: doc.type, title: doc.title, nodes: doc.nodes.map(clean), edges: doc.edges.map(clean) };
}
function clean(x) {
  const { selected, dragging, measured, resizing, ...rest } = x;
  return rest;
}
