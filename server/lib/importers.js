"use strict";
/**
 * Importers that turn existing artefacts into a class diagram:
 *  - OpenAPI / Swagger (JSON or YAML)  -> schemas become classes (the idea behind swagger2puml)
 *  - Java / TypeScript / PHP source    -> classes, members, inheritance (the idea behind umlwriter)
 * Nodes come back at (0,0); the client lays them out.
 */

let YAML = null;
try {
  YAML = require("yaml");
} catch (_) {
  /* optional: YAML input is then rejected with a clear message */
}

let uid = 0;
const nid = (p) => `${p}${++uid}`;

const classNode = (label, kind, attrs, methods) => ({
  id: nid("c"),
  type: "umlClass",
  position: { x: 0, y: 0 },
  data: {
    label,
    kind,
    attributes: attrs.join("\n"),
    methods: methods.join("\n"),
  },
});
const edge = (s, t, rel, extra = {}) => ({
  id: nid("e"),
  source: s,
  target: t,
  type: "uml",
  data: {
    relType: rel,
    label: "",
    sourceMult: "",
    targetMult: "",
    sourceCard: "",
    targetCard: "",
    ...extra,
  },
});

/* ------------------------------------------------------------------ OpenAPI */
function fromOpenApi(text, opts = {}) {
  let doc;
  const src = String(text || "").trim();
  if (!src) throw new Error("Paste an OpenAPI or Swagger document first.");
  try {
    doc = JSON.parse(src);
  } catch (_) {
    if (!YAML)
      throw new Error(
        'This looks like YAML. Install the "yaml" package on the server, or paste JSON.',
      );
    try {
      doc = YAML.parse(src);
    } catch (e) {
      throw new Error(
        "Could not parse the document as JSON or YAML: " + e.message,
      );
    }
  }
  const schemas =
    (doc.components && doc.components.schemas) || doc.definitions || {};
  const names = Object.keys(schemas);
  if (!names.length)
    throw new Error(
      "No schemas found. Expected components.schemas (OpenAPI 3) or definitions (Swagger 2).",
    );

  const refName = (r) =>
    String(r || "")
      .split("/")
      .pop();
  const typeOf = (p) => {
    if (!p) return "any";
    if (p.$ref) return refName(p.$ref);
    if (p.type === "array") return `${typeOf(p.items)}[]`;
    if (p.enum) return "enum";
    return p.format ? `${p.type}<${p.format}>` : p.type || "object";
  };
  const target = (p) =>
    p && p.$ref
      ? refName(p.$ref)
      : p && p.type === "array" && p.items && p.items.$ref
        ? refName(p.items.$ref)
        : null;

  const nodes = [];
  const byName = {};
  const edges = [];
  const pending = [];

  for (const name of names) {
    const sch = schemas[name] || {};
    const parts = Array.isArray(sch.allOf) ? sch.allOf : [sch];
    const props = {};
    let required = [];
    const parents = [];
    for (const part of parts) {
      if (part.$ref) parents.push(refName(part.$ref));
      Object.assign(props, part.properties || {});
      required = required.concat(part.required || []);
    }
    const isEnum = Array.isArray(sch.enum);
    const attrs = isEnum
      ? sch.enum.map((v) => String(v))
      : Object.entries(props).map(
          ([k, p]) => `+ ${k}${required.includes(k) ? "" : "?"}: ${typeOf(p)}`,
        );
    const node = classNode(name, isEnum ? "enum" : "class", attrs, []);
    nodes.push(node);
    byName[name] = node;
    parents.forEach((p) =>
      pending.push({ from: name, to: p, rel: "generalization" }),
    );
    Object.entries(props).forEach(([k, p]) => {
      const t = target(p);
      if (t)
        pending.push({
          from: name,
          to: t,
          rel: "association",
          label: k,
          many: p.type === "array",
        });
    });
  }

  const seen = new Set();
  for (const p of pending) {
    if (!byName[p.from] || !byName[p.to] || p.from === p.to) continue;
    const key = `${p.from}|${p.to}|${p.rel}|${p.label || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(
      edge(
        byName[p.from].id,
        byName[p.to].id,
        p.rel,
        p.rel === "association"
          ? { label: p.label, targetMult: p.many ? "*" : "1" }
          : {},
      ),
    );
  }

  if (opts.includeEndpoints && doc.paths) {
    const groups = {};
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [verb, op] of Object.entries(item || {})) {
        if (!["get", "post", "put", "patch", "delete"].includes(verb) || !op)
          continue;
        const tag = (op.tags && op.tags[0]) || "Default";
        const ok = op.responses && (op.responses["200"] || op.responses["201"]);
        const content = ok && ok.content && Object.values(ok.content)[0];
        const sc = (content && content.schema) || (ok && ok.schema);
        (groups[tag] = groups[tag] || []).push({
          line: `+ ${op.operationId || verb + path.replace(/\W+/g, "_")}(): ${typeOf(sc) === "any" ? "void" : typeOf(sc)}`,
          sc,
        });
      }
    }
    for (const [tag, ops] of Object.entries(groups)) {
      const n = classNode(
        `${tag.replace(/\W+/g, "")}Api`,
        "interface",
        [],
        ops.map((o) => o.line),
      );
      nodes.push(n);
      const targets = new Set(
        ops
          .map((o) =>
            target(
              o.sc && o.sc.type === "array"
                ? { type: "array", items: o.sc.items }
                : o.sc,
            ),
          )
          .filter(Boolean),
      );
      targets.forEach(
        (t) => byName[t] && edges.push(edge(n.id, byName[t].id, "dependency")),
      );
    }
  }
  return { nodes, edges, needsLayout: true };
}

/* ------------------------------------------------------------- source code */
const MODS =
  /\b(public|private|protected|static|final|abstract|readonly|async|override|default|synchronized|native|transient|volatile|export|declare)\b/g;

function detectLanguage(src) {
  if (/<\?php|\bfunction\s+\w+\s*\(|\$this->/.test(src)) return "php";
  if (
    /\bpublic\s+(static\s+)?(class|interface|enum)\b|\bimport\s+java\.|System\.out/.test(
      src,
    )
  )
    return "java";
  if (
    /:\s*(string|number|boolean|void)\b|\binterface\s+\w+\s*(extends|\{)/.test(
      src,
    )
  )
    return "ts";
  return "java";
}

function matchBrace(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") d++;
    else if (s[i] === "}" && --d === 0) return i;
  }
  return s.length - 1;
}

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*#.*$/gm, "")
    .replace(/@\w+(\([^)]*\))?/g, "");
}

function statements(body) {
  const out = [];
  let buf = "";
  let depth = 0;
  let paren = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") paren++;
    if (ch === ")") paren--;
    if (ch === "{" && paren === 0) {
      if (depth === 0) {
        out.push({ head: buf.trim(), block: true });
        buf = "";
      }
      depth++;
    } else if (ch === "}" && paren === 0) {
      depth--;
    } else if (depth === 0) {
      if (ch === ";" && paren === 0) {
        if (buf.trim()) out.push({ head: buf.trim(), block: false });
        buf = "";
      } else buf += ch;
    }
  }
  if (buf.trim()) out.push({ head: buf.trim(), block: false });
  return out.filter((s) => s.head);
}

function parseMember(stmt, lang, className, kind) {
  let head = stmt.head.replace(/\s+/g, " ").trim();
  if (
    !head ||
    /^(import|package|use|namespace|return|case|if|for|while)\b/.test(head)
  )
    return null;
  const vis = /\bprivate\b/.test(head)
    ? "-"
    : /\bprotected\b/.test(head)
      ? "#"
      : /\bpublic\b/.test(head)
        ? "+"
        : lang === "java" && kind !== "interface"
          ? "~"
          : "+";
  const isStatic = /\bstatic\b/.test(head);
  const isAbstract = /\babstract\b/.test(head);
  const clean = head.replace(MODS, " ").replace(/\s+/g, " ").trim();
  const mark = (t) => (isStatic ? `${vis} ${t}` : `${vis} ${t}`);

  if (clean.includes("(")) {
    const open = clean.indexOf("(");
    const close = clean.lastIndexOf(")");
    const before = clean.slice(0, open).trim();
    const params = clean.slice(open + 1, close).trim();
    const after = clean
      .slice(close + 1)
      .replace(/^\s*:\s*/, "")
      .replace(/\bthrows\b.*/, "")
      .trim();
    let name;
    let ret = after;
    if (lang === "java") {
      const bits = before.split(" ");
      name = bits.pop();
      ret = bits.join(" ");
    } else if (lang === "php") {
      name = before.replace(/^function\s+/, "").trim();
      ret = after;
    } else {
      name = before.replace(/^(get|set)\s+/, "$1_").trim();
    }
    if (!name || /\W/.test(name.replace(/_/g, ""))) return null;
    if (
      name === className ||
      name === "__construct" ||
      name === "constructor"
    ) {
      return { kind: "method", text: `${vis} ${name}(${params})` };
    }
    return {
      kind: "method",
      text: `${mark(`${name}(${params})`)}${ret ? `: ${ret}` : ""}`,
      abstract: isAbstract,
    };
  }

  if (stmt.block) return null;
  let type = "";
  let name = "";
  let c = clean.replace(/\s*=.*$/, "");
  if (lang === "php") {
    const m = c.match(/^(?:var\s+)?(?:(\??[\w\\|]+)\s+)?\$(\w+)$/);
    if (!m) return null;
    type = m[1] || "";
    name = m[2];
  } else if (lang === "ts") {
    const m = c.match(/^([\w$]+)\??\s*(?::\s*(.+))?$/);
    if (!m) return null;
    name = m[1];
    type = (m[2] || "").trim();
  } else {
    const bits = c.split(" ");
    name = bits.pop();
    type = bits.join(" ");
    if (!type || /\W/.test(name)) return null;
  }
  if (!name) return null;
  return {
    kind: "field",
    text: `${vis} ${name}${type ? `: ${type}` : ""}`,
    type,
  };
}

function fromSource(text, language) {
  const raw = String(text || "");
  if (!raw.trim()) throw new Error("Paste some source code first.");
  const lang =
    !language || language === "auto" ? detectLanguage(raw) : language;
  const src = stripComments(raw);
  const re =
    /\b(abstract\s+)?(class|interface|enum|trait)\s+([A-Za-z_]\w*)(?:\s*<[^>{]*>)?((?:\s+(?:extends|implements)\s+[\w\\.,\s<>]+?)*)\s*\{/g;

  const found = [];
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const end = matchBrace(src, open);
    const rel = m[4] || "";
    const ext = (rel.match(/extends\s+([\w\\.,\s<>]+?)(?=\s+implements|$)/) ||
      [])[1];
    const imp = (rel.match(/implements\s+([\w\\.,\s<>]+)/) || [])[1];
    const list = (s) =>
      s
        ? s
            .split(",")
            .map((x) => x.replace(/<.*$/, "").split(/[\\.]/).pop().trim())
            .filter(Boolean)
        : [];
    found.push({
      name: m[3],
      kind:
        m[2] === "enum"
          ? "enum"
          : m[2] === "interface"
            ? "interface"
            : m[1]
              ? "abstract"
              : "class",
      extends: list(ext),
      implements: list(imp),
      body: src.slice(open + 1, end),
    });
    re.lastIndex = open + 1; // allow nested/inner classes to be found too
  }
  if (!found.length)
    throw new Error(
      "No classes found. Check the language, or paste a complete class declaration.",
    );

  const nodes = [];
  const byName = {};
  const edges = [];
  const fieldTypes = [];

  for (const c of found) {
    if (byName[c.name]) continue;
    const attrs = [];
    const methods = [];
    let body = c.body;
    // drop nested type bodies so their members don't leak into the parent
    body = body.replace(/\b(class|interface|enum)\s+\w+[^{]*\{/g, (x) => x);
    for (const st of statements(body)) {
      if (c.kind === "enum" && !st.block) {
        st.head.split(",").forEach((v) => {
          const t = v.trim().split(/[\s(=]/)[0];
          if (t) attrs.push(t);
        });
        continue;
      }
      const mem = parseMember(st, lang, c.name, c.kind);
      if (!mem) continue;
      if (mem.kind === "field") {
        attrs.push(mem.text);
        fieldTypes.push({ owner: c.name, type: mem.type, text: mem.text });
      } else methods.push(mem.text);
    }
    const node = classNode(c.name, c.kind, attrs, methods);
    nodes.push(node);
    byName[c.name] = node;
  }

  for (const c of found) {
    const n = byName[c.name];
    c.extends.forEach(
      (p) =>
        byName[p] &&
        edges.push(
          edge(
            n.id,
            byName[p].id,
            c.kind === "interface" ? "generalization" : "generalization",
          ),
        ),
    );
    c.implements.forEach(
      (p) => byName[p] && edges.push(edge(n.id, byName[p].id, "realization")),
    );
  }
  const seen = new Set();
  for (const f of fieldTypes) {
    const many = /\[\]|<|\barray\b|\bList\b|\bSet\b|\bCollection\b/i.test(
      f.type || "",
    );
    const mentioned = String(f.type || "").match(/[A-Z]\w*/g) || [];
    for (const t of mentioned) {
      if (t === f.owner || !byName[t]) continue;
      const key = `${f.owner}>${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(
        edge(byName[f.owner].id, byName[t].id, "association", {
          targetMult: many ? "*" : "1",
          label: (f.text.match(/[+\-#~]\s*(\w+)/) || [])[1] || "",
        }),
      );
    }
  }
  return { nodes, edges, needsLayout: true, language: lang };
}

module.exports = { fromOpenApi, fromSource };
