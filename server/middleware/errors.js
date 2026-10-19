/* Consistent JSON errors for every unmatched route and thrown error. */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;
  // Custom HttpError style support
  const status = err.status || err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('[api]', err.stack || err.message || err);
  res.status(status).json({ error: err.message || 'Internal server error' });
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
