// Vercel serverless entry. vercel.json rewrites every /api/* request here;
// the same handler runs locally from server/index.js.
const { handle } = require('../server/handler');

module.exports = (req, res) => handle(req, res);
