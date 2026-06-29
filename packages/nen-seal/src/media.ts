/**
 * Nen for Forms/uploads & Media (M1) — seal files and images.
 *
 * The browser seals a file or image to the server's published ML-KEM key
 * *before* it is uploaded, so it is ciphertext the moment it leaves the page and
 * stays ciphertext in object storage, the CDN, and logs. Only a holder of the
 * secret key can open it. Built on the framed envelope so large media is split
 * into independent AEAD frames (one KEM operation per file).
 *
 * The byte-level API ({@link sealMediaBytes} / {@link openMediaBytes}) is
 * environment-agnostic and unit-tested. The Blob/`<img>` conveniences are thin
 * wrappers for the browser.
 */
import {
  sealFramed,
  openFramed,
  NenFramedEnvelope,
  FramedSealOptions,
} from './index';

/** A sealed file/image: the framed envelope plus the metadata needed to rebuild it. */
export interface SealedMedia {
  envelope: NenFramedEnvelope;
  /** MIME type, so the decrypted Blob can be reconstructed (e.g. "image/png"). */
  type?: string;
  /** Original byte length. */
  size: number;
}

export interface SealMediaOptions extends FramedSealOptions {
  /** MIME type to record (defaults to the Blob's type when sealing a Blob). */
  type?: string;
}

/** Seal raw bytes (an image, PDF, video chunk, …) to a recipient public key. */
export function sealMediaBytes(
  recipientPublicKey: Uint8Array,
  bytes: Uint8Array,
  opts: SealMediaOptions = {}
): SealedMedia {
  const envelope = sealFramed(recipientPublicKey, bytes, {
    context: opts.context ?? 'media',
    frameSize: opts.frameSize,
  });
  return { envelope, type: opts.type, size: bytes.length };
}

/** Open sealed media back into raw bytes. */
export function openMediaBytes(secretKey: Uint8Array, media: SealedMedia): Uint8Array {
  return openFramed(secretKey, media.envelope);
}

/* ------------------------------------------------------------------ *
 * Browser conveniences (Blob / File / <img>)
 * ------------------------------------------------------------------ */

/** Seal a `Blob`/`File` (browser or Node ≥20). Records the Blob's MIME type. */
export async function sealBlob(
  recipientPublicKey: Uint8Array,
  blob: Blob,
  opts: SealMediaOptions = {}
): Promise<SealedMedia> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return sealMediaBytes(recipientPublicKey, bytes, { type: blob.type || opts.type, ...opts });
}

/** Open sealed media into a `Blob` (with its original MIME type). */
export function openBlob(secretKey: Uint8Array, media: SealedMedia): Blob {
  const bytes = openMediaBytes(secretKey, media);
  // TS 5.7 types wasm output as Uint8Array<ArrayBufferLike>; DOM BlobPart wants
  // Uint8Array<ArrayBuffer>. The bytes are a fresh ArrayBuffer-backed array.
  return new Blob([bytes as BlobPart], media.type ? { type: media.type } : undefined);
}

/**
 * Open sealed media into an object URL ready for `<img src>` / `<video src>`.
 * Browser-only (needs `URL.createObjectURL`). Revoke it when done.
 */
export function openObjectURL(secretKey: Uint8Array, media: SealedMedia): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('nen/seal: openObjectURL requires a browser (URL.createObjectURL)');
  }
  return URL.createObjectURL(openBlob(secretKey, media));
}
