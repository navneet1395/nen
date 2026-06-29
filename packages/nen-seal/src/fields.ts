/**
 * Field-level encryption — the "encrypt-before-log / encrypt-before-DB" helper.
 *
 * Pick the sensitive fields of an object by dot-path; each is sealed in place to
 * a recipient public key and replaced with a tagged envelope. The surrounding
 * object stays plain (and queryable on its non-sensitive fields), so it can flow
 * through logs, queues, and a database while the sensitive values remain
 * ciphertext until someone holding the secret key calls {@link openFields}.
 *
 * Each field is bound to its own path as context, so a sealed `user.ssn` cannot
 * be transplanted to another field and opened there.
 */
import { seal, open, NenEnvelope, SealOptions } from './index';

const SEALED_TAG = '$nenSealed';

/** A sealed field: a {@link NenEnvelope} tagged so {@link openFields} finds it. */
export type SealedField = NenEnvelope & { [SEALED_TAG]: true };

function isSealedField(v: unknown): v is SealedField {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>)[SEALED_TAG] === true &&
    typeof (v as Record<string, unknown>).kem === 'string'
  );
}

function getPath(obj: any, path: string): { parent: any; key: string; exists: boolean } {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return { parent: undefined, key: '', exists: false };
    cur = cur[parts[i]];
  }
  const key = parts[parts.length - 1];
  const exists = cur != null && typeof cur === 'object' && key in cur;
  return { parent: cur, key, exists };
}

export interface SealFieldsOptions {
  /**
   * Override the per-field context. Receives the dot-path; return the context
   * to bind. Defaults to `field:<path>`.
   */
  context?: (path: string) => string;
}

/**
 * Return a deep clone of `obj` with each `paths` entry replaced by a sealed
 * envelope. Missing paths are skipped. The original object is not mutated.
 */
export function sealFields<T extends object>(
  obj: T,
  paths: string[],
  recipientPublicKey: Uint8Array,
  opts: SealFieldsOptions = {}
): T {
  const clone = structuredClone(obj);
  const ctxFor = opts.context ?? ((p: string) => `field:${p}`);

  for (const path of paths) {
    const { parent, key, exists } = getPath(clone, path);
    if (!exists) continue;
    const sealOpts: SealOptions = { context: ctxFor(path) };
    const env = seal(recipientPublicKey, new TextEncoder().encode(JSON.stringify(parent[key])), sealOpts);
    parent[key] = { [SEALED_TAG]: true, ...env } as SealedField;
  }
  return clone;
}

/**
 * Walk `obj` and decrypt every sealed field in place (deep). Returns a clone;
 * the input is not mutated. Non-sealed values are left untouched.
 */
export function openFields<T = any>(obj: T, secretKey: Uint8Array): T {
  const walk = (node: any): any => {
    if (isSealedField(node)) {
      // The envelope carries its own ctx, so open() re-derives the right key.
      const { [SEALED_TAG]: _tag, ...env } = node;
      return JSON.parse(new TextDecoder().decode(open(secretKey, env as NenEnvelope)));
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(node)) out[k] = walk(node[k]);
      return out;
    }
    return node;
  };
  return walk(structuredClone(obj));
}

/** True if `obj` (deep) still contains any sealed field. */
export function hasSealedFields(obj: unknown): boolean {
  if (isSealedField(obj)) return true;
  if (Array.isArray(obj)) return obj.some(hasSealedFields);
  if (obj && typeof obj === 'object') return Object.values(obj).some(hasSealedFields);
  return false;
}
