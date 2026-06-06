import { withNen } from '@withnen/server';
import {
  getNote,
  updateNote,
  deleteNote,
  noteIdFromUrl,
} from '@/lib/notesStore';

/**
 * POST /api/notes/:id — read a single note.
 *
 * Reads go over POST (not GET) because withNen needs an encrypted body and
 * GET requests cannot carry one. The id is taken from the URL path so it is
 * covered by the HMAC canonical string (METHOD\nPATH\nTS\nNONCE).
 */
export const POST = withNen(async (req) => {
  const note = getNote(noteIdFromUrl(req.url));
  if (!note) return { ok: false, error: 'not_found' };
  return { ok: true, note };
});

/** PUT /api/notes/:id — update an existing note. */
export const PUT = withNen(async (req, body) => {
  const note = updateNote(noteIdFromUrl(req.url), body ?? {});
  if (!note) return { ok: false, error: 'not_found' };
  return { ok: true, note };
});

/** DELETE /api/notes/:id — remove a note (body may be empty `{}`). */
export const DELETE = withNen(async (req) => {
  const removed = deleteNote(noteIdFromUrl(req.url));
  return { ok: removed, deleted: removed };
});
