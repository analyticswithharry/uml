'use strict';
// Quick end-to-end check of the API: `npm test`. No test framework needed.
const http = require('http');
const { handle } = require('../server/handler');

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failed++; };

function call(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ port, method, path, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const server = http.createServer(handle);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const health = await call(port, 'GET', '/api/health');
  ok(health.status === 200 && health.body.puzzles > 0, 'health endpoint');

  const list = await call(port, 'GET', '/api/puzzles');
  ok(list.body.length > 0 && !('solution' in list.body[0]), 'puzzle list hides solutions');

  for (const p of list.body) {
    const sol = await call(port, 'GET', `/api/puzzles/${p.id}/solution`);
    const res = await call(port, 'POST', `/api/puzzles/${p.id}/check`, sol.body.diagram);
    ok(res.body.correct && res.body.score === 100, `reference solution scores 100: ${p.id}`);
    const blank = await call(port, 'POST', `/api/puzzles/${p.id}/check`, { nodes: [], edges: [] });
    ok(!blank.body.correct && blank.body.score === 0, `empty board fails: ${p.id}`);
  }

  const t = await call(port, 'GET', '/api/templates');
  for (const tpl of t.body) {
    const full = await call(port, 'GET', `/api/templates/${tpl.id}`);
    const ex = await call(port, 'POST', '/api/export/plantuml', { type: full.body.diagramType, ...full.body.diagram });
    ok(ex.status === 200 && ex.body.text.startsWith('@startuml'), `PlantUML export: ${tpl.id}`);
  }

  const code = await call(port, 'POST', '/api/import/code', { language: 'java', text: 'class A extends B { private C c; } class B {} class C {}' });
  ok(code.status === 200 && code.body.nodes.length === 3 && code.body.edges.length === 2, 'import Java source');
  const bad = await call(port, 'POST', '/api/import/openapi', { text: '{"openapi":"3.0.0"}' });
  ok(bad.status === 422 && /No schemas/.test(bad.body.error), 'OpenAPI import reports a clear error');
  const nf = await call(port, 'GET', '/api/nope');
  ok(nf.status === 404, 'unknown endpoint is 404');

  server.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})();
