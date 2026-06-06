/**
 * In-memory "notes" store backing the encrypted CRUD demo app.
 *
 * This exists purely to give the Nen SDK a realistic resource to protect
 * (create / read / update / delete / list) so the regression + load harness in
 * /bench has something to drive. It is NOT part of the shippable SDK.
 *
 * Persisted on globalThis so it survives Next.js dev HMR / module reloads
 * within a single server process.
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

type Store = Map<string, Note>;

const g = globalThis as unknown as { __nenNotes?: Store };
const notes: Store = g.__nenNotes ?? (g.__nenNotes = new Map());

function id(): string {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

export function createNote(input: { title?: string; content?: string }): Note {
  const now = Date.now();
  const note: Note = {
    id: id(),
    title: String(input.title ?? 'untitled'),
    content: String(input.content ?? ''),
    createdAt: now,
    updatedAt: now,
  };
  notes.set(note.id, note);
  return note;
}

export function getNote(noteId: string): Note | undefined {
  return notes.get(noteId);
}

export function updateNote(
  noteId: string,
  patch: { title?: string; content?: string }
): Note | undefined {
  const existing = notes.get(noteId);
  if (!existing) return undefined;
  const updated: Note = {
    ...existing,
    title: patch.title !== undefined ? String(patch.title) : existing.title,
    content:
      patch.content !== undefined ? String(patch.content) : existing.content,
    updatedAt: Date.now(),
  };
  notes.set(noteId, updated);
  return updated;
}

export function deleteNote(noteId: string): boolean {
  return notes.delete(noteId);
}

export function listNotes(query?: string): Note[] {
  const all = Array.from(notes.values());
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (n) =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );
}

/** Extract the trailing `[id]` segment from a request URL pathname. */
export function noteIdFromUrl(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
}
