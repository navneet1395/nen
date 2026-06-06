import { withIsogeny } from '@isogeny/server';
import { createNote } from '@/lib/notesStore';

/**
 * POST /api/notes  — create a note (encrypted end-to-end).
 *
 * Used exactly the way the docs prescribe: the handler receives the already
 * decrypted + authenticated `body`, and whatever object it returns is
 * encrypted before it goes back on the wire.
 */
export const POST = withIsogeny(async (_req, body) => {
  const note = createNote(body ?? {});
  return { ok: true, note };
});

/**
 * GET /api/notes — intentionally wrapped with withIsogeny.
 *
 * This documents a real SDK limitation that the regression suite asserts:
 * withIsogeny requires an encrypted `{ ct, n }` body on every request, but the
 * Fetch standard forbids a body on GET. So an encrypted GET cannot complete —
 * read paths must use POST/PUT/DELETE (which allow bodies). See
 * /bench/regression.js → "GET-with-body limitation".
 */
export const GET = withIsogeny(async () => {
  return { ok: true, note: 'unreachable: GET cannot carry an encrypted body' };
});
