import { withNen } from '@withnen/server';
import {
  getNote,
  updateNote,
  deleteNote,
  noteIdFromUrl,
} from '@/lib/notesStore';

/**
 * GET /api/notes/:id — read a single note (NEN-PROTOCOL-V2).
 *
 * A real, semantically-correct GET: no request body, still authenticated, and
 * the response is encrypted. The id is taken from the URL path, which is covered
 * by the HMAC canonical string (METHOD\nPATH\nTIMESTAMP\nNONCE).
 */
export const GET = withNen(async (req) => {
  const note = getNote(noteIdFromUrl(req.url));
  if (!note) return { ok: false, error: 'not_found' };
  return { ok: true, note };
});

/** PUT /api/notes/:id — update an existing note (encrypted body + response). */
export const PUT = withNen(async (req, body) => {
  const note = updateNote(noteIdFromUrl(req.url), body ?? {});
  if (!note) return { ok: false, error: 'not_found' };
  return { ok: true, note };
});

/** DELETE /api/notes/:id — remove a note. Bodyless, authenticated, encrypted response. */
export const DELETE = withNen(async (req) => {
  const removed = deleteNote(noteIdFromUrl(req.url));
  return { ok: removed, deleted: removed };
});
