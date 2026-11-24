// Vercel serverless entry. Every /api/* request is handled by the same code that runs locally.
const { handle } = require('../server/handler');

module.exports = (req, res) => handle(req, res);
