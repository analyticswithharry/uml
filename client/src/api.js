// Thin wrapper over the Node API. GET responses are cached in memory for the session.
const cache = new Map();

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error('Cannot reach the server. If you are running locally, start it with "npm run dev".');
  }
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  return body;
}

export const api = {
  get(path) {
    if (!cache.has(path)) {
      const p = request(path).catch((e) => { cache.delete(path); throw e; });
      cache.set(path, p);
    }
    return cache.get(path);
  },
  post: (path, data) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};
