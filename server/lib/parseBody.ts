import type { VercelRequest } from '@vercel/node';

export function parseJsonBuffer(buf: Buffer): unknown {
  if (buf.length === 0) return null;
  try {
    return JSON.parse(buf.toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

export function getJsonBody(req: VercelRequest): unknown {
  if (req.body == null || req.body === '') return null;
  if (typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as unknown;
    } catch {
      return null;
    }
  }
  return null;
}
