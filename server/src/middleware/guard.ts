import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export const TOKEN_COOKIE = 'spade_token';

// Scripts only from the app itself (plus WebAssembly, for reading text out of pictures). Styles allow inline because React and FullCalendar write them. blob: covers pasted pictures, the OCR worker and file previews; data: fonts are FullCalendar's icons, which it carries inside its stylesheet.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const cookie = (header: string | undefined, name: string) =>
  header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/** The desktop app's lock on its local API: the request must be addressed to this exact address and carry this launch's token. */
export function guard(token: string, port: () => number): RequestHandler {
  const expected = Buffer.from(token);
  return (req, res, next) => {
    // A web page that points its own name at 127.0.0.1 (DNS rebinding) still sends that name as Host.
    if (req.headers.host !== `127.0.0.1:${port()}`) {
      res.status(403).json({ error: 'Forbidden', message: 'This address is not Spade.' });
      return;
    }
    const sent = Buffer.from(cookie(req.headers.cookie, TOKEN_COOKIE) ?? '');
    if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
      res.status(401).json({ error: 'Unauthorized', message: 'Only the Spade app can use this.' });
      return;
    }
    res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    next();
  };
}
