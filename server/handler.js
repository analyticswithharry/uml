'use strict';
/**
 * Redpen UML API. Plain Node (no framework), so the same handler runs
 *  - locally:  server/index.js  (http.createServer)
 *  - on Vercel: api/[...path].js (serverless function)
 * The "database" is just the JSON files in /data, loaded once at start-up.
 * Nothing is ever written: a student's work lives in the browser until refresh.
 */
const puzzles = require('../data/puzzles.json');
const templates = require('../data/templates.json');
const cheatsheet = require('../data/cheatsheet.json');
const { check } = require('./lib/checker');
const { toPlantUml, toMermaid } = require('./lib/exporters');
const { fromOpenApi, fromSource } = require('./lib/importers');

const MAX_BODY = 2 * 1024 * 1024;

const publicPuzzle = (p) => ({
  id: p.id, number: p.number, title: p.title, diagramType: p.diagramType, mode: p.mode,
  difficulty: p.difficulty, category: p.category, scenario: p.scenario, goal: p.goal,
  objective: p.objective, hints: p.hints, initial: p.initial,
});
const summary = (p) => ({
  id: p.id, number: p.number, title: p.title, diagramType: p.diagramType, mode: p.mode,
  difficulty: p.difficulty, category: p.category, goal: p.goal,
});

const routes = [];
const route = (method, pattern, fn) =>
  routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$'), fn });

route('GET', '/api/health', () => ({ ok: true, puzzles: puzzles.length, templates: templates.length }));
route('GET', '/api/puzzles', () => puzzles.map(summary));
route('GET', '/api/puzzles/:id', ({ params }) => {
  const p = puzzles.find((x) => x.id === params.id);
  return p ? publicPuzzle(p) : notFound('Puzzle not found');
});
route('POST', '/api/puzzles/:id/check', ({ params, body }) => {
  const p = puzzles.find((x) => x.id === params.id);
  if (!p) return notFound('Puzzle not found');
  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) return bad('Send { nodes: [], edges: [] }');
  return check(p, body);
});
route('GET', '/api/puzzles/:id/solution', ({ params }) => {
  const p = puzzles.find((x) => x.id === params.id);
  return p ? { diagram: p.solution, explanation: p.explanation } : notFound('Puzzle not found');
});
route('GET', '/api/templates', () => templates.map(({ id, diagramType, title, description }) => ({ id, diagramType, title, description })));
route('GET', '/api/templates/:id', ({ params }) => {
  const t = templates.find((x) => x.id === params.id);
  return t ? t : notFound('Template not found');
});
route('GET', '/api/cheatsheet', () => cheatsheet);

route('POST', '/api/export/plantuml', ({ body }) => {
  if (!body || !body.type) return bad('Send { type, nodes, edges }');
  return { format: 'plantuml', text: toPlantUml(body.type, body.nodes || [], body.edges || []) };
});
route('POST', '/api/export/mermaid', ({ body }) => {
  if (!body || !body.type) return bad('Send { type, nodes, edges }');
  return { format: 'mermaid', text: toMermaid(body.type, body.nodes || [], body.edges || []) };
});
route('POST', '/api/import/openapi', ({ body }) => fromOpenApi(body && body.text, { includeEndpoints: !!(body && body.includeEndpoints) }));
route('POST', '/api/import/code', ({ body }) => fromSource(body && body.text, body && body.language));

function bad(message) { return { __status: 400, error: message }; }
function notFound(message) { return { __status: 404, error: message }; }

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    if (Buffer.isBuffer(req.body)) return req.body.length ? JSON.parse(req.body.toString('utf8')) : {};
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Request is too large (max 2 MB).'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('Body is not valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload, cache) {
  const json = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(json);
}

async function handle(req, res) {
  try {
    const path = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      const out = await r.fn({ params: m.groups || {}, body });
      if (out && out.__status) return send(res, out.__status, { error: out.error });
      return send(res, 200, out, req.method === 'GET' ? 'public, max-age=60' : 'no-store');
    }
    const known = routes.some((r) => r.re.test(path));
    return send(res, known ? 405 : 404, { error: known ? 'Method not allowed' : 'Unknown endpoint' });
  } catch (err) {
    // Importer/exporter errors carry user-facing messages; everything else is a 500.
    const status = err.status || (err instanceof SyntaxError ? 400 : 422);
    return send(res, status, { error: err.message || 'Something went wrong.' });
  }
}

module.exports = { handle };
