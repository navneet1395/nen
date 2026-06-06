import { withNen } from '@nen/server';
import { listNotes } from '@/lib/notesStore';

/**
 * POST /api/notes/search — list / query notes.
 *
 * A static segment, so Next.js routes this before the dynamic `[id]` handler.
 * Listing is a POST (not GET) so the query travels inside the encrypted body.
 */
export const POST = withNen(async (_req, body) => {
  const notes = listNotes(body?.query);
  return { ok: true, count: notes.length, notes };
});
