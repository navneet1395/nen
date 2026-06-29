import {
  sealMediaBytes,
  openMediaBytes,
  sealBlob,
  openBlob,
  generateSealKeypair,
} from '../index';

// A tiny fake "PNG" (just bytes — the codec doesn't matter to encryption).
function fakeImage(len = 500 * 1024): Uint8Array {
  const b = new Uint8Array(len);
  for (let i = 0; i < len; i++) b[i] = (i * 7 + 13) & 0xff;
  return b;
}

describe('Nen for Media (M1) — sealed files & images', () => {
  const server = generateSealKeypair(); // server publishes server.publicKey

  test('seals and opens image bytes, preserving type & content', () => {
    const img = fakeImage();
    const sealed = sealMediaBytes(server.publicKey, img, { type: 'image/png' });

    expect(sealed.type).toBe('image/png');
    expect(sealed.size).toBe(img.length);
    expect(sealed.envelope.frames.length).toBeGreaterThan(1); // multi-frame
    // No plaintext bytes survive in the serialized envelope.
    expect(JSON.stringify(sealed.envelope).includes(Buffer.from(img.subarray(0, 16)).toString('base64'))).toBe(false);

    const out = openMediaBytes(server.secretKey, sealed);
    expect(Buffer.from(out).equals(Buffer.from(img))).toBe(true);
  });

  test('a different key cannot open the media', () => {
    const other = generateSealKeypair();
    const sealed = sealMediaBytes(server.publicKey, fakeImage(20_000));
    expect(() => openMediaBytes(other.secretKey, sealed)).toThrow();
  });

  test('Blob round-trip carries the MIME type', async () => {
    const blob = new Blob([fakeImage(64_000) as BlobPart], { type: 'image/jpeg' });
    const sealed = await sealBlob(server.publicKey, blob);
    expect(sealed.type).toBe('image/jpeg');

    const opened = openBlob(server.secretKey, sealed);
    expect(opened.type).toBe('image/jpeg');
    expect(opened.size).toBe(blob.size);
    expect(Buffer.from(await opened.arrayBuffer()).equals(Buffer.from(await blob.arrayBuffer()))).toBe(true);
  });
});
