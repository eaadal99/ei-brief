/**
 * API key middleware — validates x-api-key header.
 *
 * Every API call from the frontend must include this header.
 * The key is set via API_KEY env var on the backend and
 * NEXT_PUBLIC_API_KEY on the frontend.
 */

export function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const expected = process.env.API_KEY;

  if (!expected) {
    // No key configured — allow all (dev convenience)
    return next();
  }

  if (key === expected) {
    return next();
  }

  return res.status(401).json({ error: 'Invalid or missing API key' });
}
