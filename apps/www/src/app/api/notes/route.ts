import { withNen } from '@withnen/server';
import { createNote, listNotes } from '@/lib/notesStore';

/**
 * POST /api/notes — create a note (encrypted end-to-end).
 *
 * The handler receives the already decrypted + authenticated `body`, and
 * whatever object it returns is encrypted before it goes back on the wire.
 */
export const POST = withNen(async (_req, body) => {
  const note = createNote(body ?? {});
  return { ok: true, note };
});

/**
 * GET /api/notes — list notes (NEN-PROTOCOL-V2).
 *
 * A real GET: no request body, the request is still authenticated (HMAC +
 * timestamp + nonce via the X-Nen-Nonce header), and the response is encrypted.
 * This is the "vice-versa" property — if the payload goes encrypted, the payload
 * that comes back is encrypted too, for every method.
 */
export const GET = withNen(async () => {
  return { ok: true, notes: listNotes() };
});
