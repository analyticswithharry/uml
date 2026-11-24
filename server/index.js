'use strict';
/**
 * Local server.
 *   npm run dev    -> API only on :4000, Vite serves the UI on :5173 and proxies /api here
 *   npm start      -> after `npm run build`, serves the built UI and the API together on :4000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./handler');

const PORT = Number(process.env.PORT) || 4000;
const DIST = path.join(__dirname, '..', 'client', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api')) return handle(req, res);
  if (!fs.existsSync(DIST)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Redpen UML API is running.\nThe UI is not built yet. Run "npm run dev" (UI on http://localhost:5173) or "npm run build" then "npm start".');
  }
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.normalize(path.join(DIST, urlPath));
  if (!file.startsWith(DIST)) { res.statusCode = 403; return res.end('Forbidden'); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html'); // SPA fallback
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Redpen UML server on http://localhost:${PORT}`));
