'use strict';
/** Diagram JSON -> PlantUML / Mermaid text (same idea as umlwriter and swagger2puml, but for hand-drawn diagrams). */

const ident = (s, fallback) => {
  const v = String(s || '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return v && !/^\d/.test(v) ? v : fallback + (v || '');
};

function aliasMap(nodes, prefix) {
  const used = new Set();
  const map = {};
  nodes.forEach((n, i) => {
    let base = ident(n.data && n.data.label, prefix + (i + 1));
    let a = base;
    let k = 2;
    while (used.has(a.toLowerCase())) a = `${base}_${k++}`;
    used.add(a.toLowerCase());
    map[n.id] = a;
  });
  return map;
}

const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
const q = (s) => String(s || '').replace(/"/g, "'");

const ER_LEFT = { one_only: '||', zero_or_one: '|o', zero_or_many: '}o', one_or_many: '}|', one: '||', many: '}o' };
const ER_RIGHT = { one_only: '||', zero_or_one: 'o|', zero_or_many: 'o{', one_or_many: '|{', one: '||', many: 'o{' };

/* ---------------- PlantUML ---------------- */
function toPlantUml(type, nodes, edges) {
  const out = ['@startuml'];
  if (type === 'class') return classPuml(out, nodes, edges);
  if (type === 'usecase') return usecasePuml(out, nodes, edges);
  if (type === 'er') return erPuml(out, nodes, edges);
  throw new Error('Unknown diagram type');
}

function classPuml(out, nodes, edges) {
  const cls = nodes.filter((n) => n.type === 'umlClass');
  const al = aliasMap(cls, 'Class');
  out.push('skinparam classAttributeIconSize 0', 'hide empty members', '');
  for (const n of cls) {
    const kw = { class: 'class', abstract: 'abstract class', interface: 'interface', enum: 'enum' }[n.data.kind || 'class'];
    out.push(`${kw} "${q(n.data.label)}" as ${al[n.id]} {`);
    lines(n.data.attributes).forEach((l) => out.push(`  ${l}`));
    if (lines(n.data.attributes).length && lines(n.data.methods).length) out.push('  --');
    lines(n.data.methods).forEach((l) => out.push(`  ${l}`));
    out.push('}');
  }
  out.push('');
  for (const e of edges) {
    if (!al[e.source] || !al[e.target]) continue;
    const d = e.data || {};
    const s = al[e.source];
    const t = al[e.target];
    const lab = d.label ? ` : ${d.label}` : '';
    const sm = d.sourceMult ? ` "${q(d.sourceMult)}"` : '';
    const tm = d.targetMult ? ` "${q(d.targetMult)}"` : '';
    switch (d.relType) {
      case 'generalization': out.push(`${s} --|> ${t}${lab}`); break;
      case 'realization': out.push(`${s} ..|> ${t}${lab}`); break;
      case 'dependency': out.push(`${s}${sm} ..>${tm} ${t}${lab}`); break;
      case 'aggregation': out.push(`${t}${tm} o--${sm} ${s}${lab}`); break;
      case 'composition': out.push(`${t}${tm} *--${sm} ${s}${lab}`); break;
      default: out.push(`${s}${sm} --${tm} ${t}${lab}`);
    }
  }
  out.push('@enduml');
  return out.join('\n');
}

function usecasePuml(out, nodes, edges) {
  const items = nodes.filter((n) => n.type === 'actor' || n.type === 'useCase');
  const al = aliasMap(items, 'N');
  const boundaries = nodes.filter((n) => n.type === 'boundary');
  out.push('left to right direction', '');
  for (const n of items.filter((i) => i.type === 'actor')) out.push(`actor "${q(n.data.label)}" as ${al[n.id]}`);
  const placed = new Set();
  for (const b of boundaries) {
    const w = b.width || 400;
    const h = b.height || 300;
    const inside = items.filter((n) => {
      if (n.type !== 'useCase') return false;
      const cx = n.position.x + 60;
      const cy = n.position.y + 25;
      return cx >= b.position.x && cx <= b.position.x + w && cy >= b.position.y && cy <= b.position.y + h;
    });
    out.push(`rectangle "${q(b.data.label)}" {`);
    inside.forEach((n) => { out.push(`  usecase "${q(n.data.label)}" as ${al[n.id]}`); placed.add(n.id); });
    out.push('}');
  }
  for (const n of items.filter((i) => i.type === 'useCase' && !placed.has(i.id))) out.push(`usecase "${q(n.data.label)}" as ${al[n.id]}`);
  out.push('');
  for (const e of edges) {
    if (!al[e.source] || !al[e.target]) continue;
    const d = e.data || {};
    const s = al[e.source];
    const t = al[e.target];
    if (d.relType === 'include') out.push(`${s} .> ${t} : <<include>>`);
    else if (d.relType === 'extend') out.push(`${s} .> ${t} : <<extend>>`);
    else if (d.relType === 'generalization') out.push(`${s} --|> ${t}`);
    else out.push(`${s} -- ${t}${d.label ? ` : ${d.label}` : ''}`);
  }
  out.push('@enduml');
  return out.join('\n');
}

function erPuml(out, nodes, edges) {
  const ents = nodes.filter((n) => n.type === 'erEntity');
  const al = aliasMap(ents, 'Entity');
  out.push('hide circle', 'skinparam linetype ortho', '');
  for (const n of ents) {
    out.push(`entity "${q(n.data.label)}" as ${al[n.id]} {`);
    const all = lines(n.data.attributes);
    const keys = all.filter((l) => /^PK\b/i.test(l));
    const rest = all.filter((l) => !/^PK\b/i.test(l));
    const fmt = (l, star) => {
      const m = l.match(/^(?:(PK|FK|UK)\s+)?(.*)$/i);
      const tag = m[1] ? ` <<${m[1].toUpperCase()}>>` : '';
      return `  ${star ? '*' : ''}${m[2].replace(/:\s*/, ' : ')}${tag}`;
    };
    keys.forEach((l) => out.push(fmt(l, true)));
    if (keys.length && rest.length) out.push('  --');
    rest.forEach((l) => out.push(fmt(l, false)));
    out.push('}');
  }
  out.push('');
  for (const e of edges) {
    if (!al[e.source] || !al[e.target]) continue;
    const d = e.data || {};
    const l = ER_LEFT[d.sourceCard] || '||';
    const r = ER_RIGHT[d.targetCard] || 'o{';
    out.push(`${al[e.source]} ${l}--${r} ${al[e.target]}${d.label ? ` : ${d.label}` : ''}`);
  }
  out.push('@enduml');
  return out.join('\n');
}

/* ---------------- Mermaid ---------------- */
function toMermaid(type, nodes, edges) {
  if (type === 'class') {
    const cls = nodes.filter((n) => n.type === 'umlClass');
    const al = aliasMap(cls, 'Class');
    const out = ['classDiagram'];
    for (const n of cls) {
      out.push(`  class ${al[n.id]} {`);
      const st = { abstract: '<<abstract>>', interface: '<<interface>>', enum: '<<enumeration>>' }[n.data.kind];
      if (st) out.push(`    ${st}`);
      lines(n.data.attributes).forEach((l) => out.push(`    ${l}`));
      lines(n.data.methods).forEach((l) => out.push(`    ${l}`));
      out.push('  }');
    }
    for (const e of edges) {
      if (!al[e.source] || !al[e.target]) continue;
      const d = e.data || {};
      const s = al[e.source];
      const t = al[e.target];
      const lab = d.label ? ` : ${d.label}` : '';
      const sm = d.sourceMult ? ` "${q(d.sourceMult)}"` : '';
      const tm = d.targetMult ? ` "${q(d.targetMult)}"` : '';
      switch (d.relType) {
        case 'generalization': out.push(`  ${t} <|-- ${s}${lab}`); break;
        case 'realization': out.push(`  ${t} <|.. ${s}${lab}`); break;
        case 'dependency': out.push(`  ${s}${sm} ..>${tm} ${t}${lab}`); break;
        case 'aggregation': out.push(`  ${t}${tm} o--${sm} ${s}${lab}`); break;
        case 'composition': out.push(`  ${t}${tm} *--${sm} ${s}${lab}`); break;
        default: out.push(`  ${s}${sm} --${tm} ${t}${lab}`);
      }
    }
    return out.join('\n');
  }
  if (type === 'er') {
    const ents = nodes.filter((n) => n.type === 'erEntity');
    const al = aliasMap(ents, 'Entity');
    const out = ['erDiagram'];
    for (const n of ents) {
      out.push(`  ${al[n.id]} {`);
      lines(n.data.attributes).forEach((l) => {
        const m = l.match(/^(?:(PK|FK|UK)\s+)?([\w]+)\s*:?\s*(.*)$/i);
        if (!m) return;
        out.push(`    ${ident(m[3] || 'string', 't')} ${m[2]}${m[1] ? ' ' + m[1].toUpperCase() : ''}`);
      });
      out.push('  }');
    }
    for (const e of edges) {
      if (!al[e.source] || !al[e.target]) continue;
      const d = e.data || {};
      out.push(`  ${al[e.source]} ${ER_LEFT[d.sourceCard] || '||'}--${ER_RIGHT[d.targetCard] || 'o{'} ${al[e.target]} : "${q(d.label || 'relates')}"`);
    }
    return out.join('\n');
  }
  throw new Error('Mermaid export supports class and ER diagrams. Use PlantUML for use case diagrams.');
}

module.exports = { toPlantUml, toMermaid };
