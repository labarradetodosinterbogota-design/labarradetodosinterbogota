import type { VercelRequest } from '@vercel/node';

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
