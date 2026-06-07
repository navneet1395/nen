# Proposal 001 — Bidirectional, method-agnostic payload encryption

> **Status:** ✅ Implemented and shipped — `NEN-PROTOCOL-V2`, `@withnen/client`
> & `@withnen/server` `v0.3.0`, `@withnen/ai` `v0.2.0`. `PROTOCOL.md` now describes
> V2. This document is kept as the design record.

## 1. The problem

Nen's promise is *end-to-end payload encryption*. Today that promise only holds
for **request-carrying methods**, and only **half-symmetrically**:

- `withNen` calls `await req.json()` and requires an encrypted `{ ct, n }` body on
  **every** request. The Fetch standard forbids a body on `GET`, so **an encrypted
  `GET` cannot complete**. The codebase documents this as a known limitation and the
  regression suite asserts it (`bench/regression.js` → "GET-with-body limitation").
- The practical fallout: to *read* a resource you are forced into a semantically
  wrong `POST /api/notes/:id`. Reads should be `GET`s.
- `withNenStream` only runs HMAC verification **inside** its `POST/PUT/PATCH`
  branch. A streaming `GET` would therefore **skip request authentication entirely**
  — a silent security hole.
- The mental model is lopsided. The product should be **vice-versa**: *if a payload
  goes encrypted, the payload that comes back is encrypted too* — for **every**
  method, with the request **always authenticated** regardless of whether it has a
  body.

## 2. The principle

> **Authentication is universal. Encryption is symmetric.**
>
> - **Every** request (any method) is authenticated: HMAC + timestamp window +
>   nonce-replay check.
> - A request body is encrypted **iff** one exists.
> - A response body is **always** encrypted.

| Method | Auth (HMAC+TS+nonce) | Request body encrypted | Response body encrypted |
| :-- | :-: | :-: | :-: |
| `GET` | ✅ | — (no body) | ✅ |
| `HEAD` | ✅ | — | n/a — no body per HTTP spec; request is still authenticated and metadata headers are returned (§7.2) |
| `DELETE` | ✅ | optional | ✅ |
| `POST` / `PUT` / `PATCH` | ✅ | ✅ | ✅ |
| `OPTIONS` | passthrough (CORS preflight is unauthenticated) | — | — |

## 3. The core change — move the request nonce into a header

The single blocker is that the per-request nonce currently lives **inside the body**
(`{ ct, n }`), so a bodyless method has no nonce — which breaks both the HMAC
canonical string and replay tracking.

**Fix:** promote the nonce to an always-present request header.

```
X-Nen-Nonce: base64(n)      // present on EVERY request, all methods
```

- It is **the** canonical request nonce: used in the HMAC string and as the
  replay-tracking key.
- When the request **has** a body, that body is sealed under this same nonce, so the
  request body wire format simplifies from `{ ct, n }` to **`{ ct }`**.
- When the request has **no** body, the header nonce still drives HMAC + replay.

The nonce is not secret, so a header is a fine home for it.

### Canonical string (shape unchanged)

```
METHOD \n PATH \n TIMESTAMP \n NONCE
```

where `NONCE` is now the `X-Nen-Nonce` value — **never empty** (V1 used `""` for
bodyless requests, which is exactly why bodyless replay protection was impossible).

### Request wire format (V2)

```
Headers (all methods):
  X-Nen-Session:    <sid>
  X-Nen-Timestamp:  <unix_ms>
  X-Nen-Nonce:      base64(n)
  X-Nen-Signature:  base64( HMAC-SHA256(hmacKey, canonical) )
Body (only when the method carries one):
  { "ct": base64( AEAD.encrypt(ss, n, plaintext) ) }
```

### Response wire format (unchanged, always encrypted)

```
Non-stream:  { "ct": base64( AEAD.encrypt(ss, n', response) ), "n": base64(n') }
Stream:      X-Nen-Stream-Nonce: base64(baseNonce)  +  encrypted SSE frames
```

The server already generates a fresh `n'` per response. Request `n` and response
`n'` are independent random 96-bit nonces; collision is bounded by the birthday
limit (~2⁴⁸ messages) — standard and safe for ChaCha20-Poly1305 with random nonces.

## 4. Server verification order (V2)

In the refactored middleware, run for **every** method:

1. Session lookup (`X-Nen-Session`). Missing header → `ISO-2003`; unknown/expired
   session → `ISO-2002`.
2. Read `X-Nen-Nonce`. Missing → **`ISO-3005` `AUTH_NONCE_MISSING`** (new code, §7.1).
3. **HMAC (mandatory under `strict`)** over `METHOD\nPATH\nTIMESTAMP\nNONCE`:
   missing signature → `ISO-3001`; bad → `ISO-3002`; timestamp outside ±30 s →
   `ISO-3003`.
4. Nonce replay: unseen-per-session check on the header nonce → reuse is `ISO-5001`.
5. **Only if a body is present:** AEAD-decrypt `{ ct }` under the header nonce. Tag
   failure → `ISO-4001`; decrypted non-JSON → `ISO-4003`.
6. Run the handler. `body` is `null` for bodyless requests; the decrypted object
   otherwise.
7. **Always** encrypt the handler's return value into `{ ct, n' }` and respond.

Note steps 1–4 now run for **all** methods (the streaming wrapper's auth hole is
closed as a side effect).

## 5. Developer experience after this lands

```ts
// Reads are real GETs again — response still fully encrypted.
export const GET = withNen(async (req) => {
  const id = noteIdFromUrl(req.url);
  const note = getNote(id);
  return note ? { ok: true, note } : { ok: false, error: 'not_found' };
});

// Writes unchanged.
export const POST = withNen(async (_req, body) => {
  return { ok: true, note: createNote(body) };
});

// DELETE needs no body; response encrypted.
export const DELETE = withNen(async (req) => {
  return { ok: deleteNote(noteIdFromUrl(req.url)) };
});
```

Client stays identical to call:

```ts
const note = await client.nenFetch('/api/notes/123');           // GET, encrypted response
await client.nenFetch('/api/notes', { method: 'POST', body });  // encrypted both ways
await client.nenFetch('/api/notes/123', { method: 'DELETE' });  // auth + encrypted response
```

## 6. The honest boundary — `GET` query strings

This proposal makes `GET` **work** and encrypts its **response**, but a `GET`'s
**URL is not a payload** — query strings live in the request line and are logged by
proxies, CDNs, and access logs. They cannot be encrypted while the request remains a
real `GET`.

Guidance baked into the docs:

- **Resource identifiers in the path** (`/api/notes/123`) — fine. The path is
  covered by the HMAC canonical string (integrity-protected, tamper-evident), and
  the **response** is encrypted.
- **Sensitive selectors** (e.g. an SSN you're searching by) — do **not** put them in
  a `GET` query string. Use `POST` with an encrypted body (this is why search in the
  demo is `POST /api/notes/search`).
- **Future (optional):** an `encryptedQuery` helper that packs params into a single
  opaque `?q=<ciphertext>` token for teams who want encrypted selectors on a
  cacheable-looking URL. Out of scope for V2; noted so the door stays open.

This section is deliberately explicit — a security reviewer will ask, and the answer
is "path + response are protected; query *values* are URL metadata, use POST for
secrets," not a vague claim that GETs are "fully encrypted."

## 7. Decisions

**Foundational**

- **Clean break, no dual format.** V2 removes the `{ ct, n }`-in-body request shape;
  no V1/V2 branch on the server (consistent with the "no array-vs-base64 branches"
  rule in CLAUDE.md). Client + server bump together to `v0.3.0`; both are ours.
- **Header name:** `X-Nen-Nonce` (joins the existing `X-Nen-*` family).
- **Response unchanged:** still `{ ct, n' }` in body / `X-Nen-Stream-Nonce` for
  streams. No response-header nonce needed.

**Resolved**

1. **Missing `X-Nen-Nonce` → new `ISO-3005 AUTH_NONCE_MISSING`.** A request that
   reaches a `withNen` route without `X-Nen-Nonce` is an unauthenticated/garbled
   client; it gets a dedicated 401 code so it is unambiguous in logs and support.
   Added to `ERROR_CODES.md` and both `errors.ts` catalogs (server full, client
   subset).
2. **`HEAD` is fully supported.** `withNen` authenticates the `HEAD` request exactly
   like a `GET` (HMAC + timestamp + nonce), runs the handler so it can compute
   resource metadata, then returns a bodyless `200` whose headers (e.g.
   `Content-Type`, and a `Content-Length` reflecting the size the encrypted body
   *would* have) describe the resource. There is no body to encrypt — by HTTP spec a
   `HEAD` response carries none — so confidentiality is N/A while authenticity still
   applies.
3. **Streaming `GET` is enabled.** `withNenStream` accepts `GET` (and other bodyless
   methods): the request is authenticated from headers and the encrypted SSE response
   streams back with no request body required — subscribe-style encrypted feeds.

## 8. Implementation checklist (for the build step)

**Crypto / protocol**
- [ ] No Wasm change required — reuses `nen_encrypt` / `nen_decrypt` /
      `nen_generate_nonce` / `nen_hmac_*`.

**`@withnen/server`**
- [ ] `errors.ts` — add `ISO-3005 AUTH_NONCE_MISSING` (401).
- [ ] `middleware.ts` — split `decryptPayload` into `verifyRequest()` (HMAC + TS +
      replay, all methods, nonce from `X-Nen-Nonce`; missing nonce → `ISO-3005`) and
      `decryptBody()` (AEAD only).
- [ ] `wrapper.ts` (`withNen`) — detect body presence; pass `null` body for bodyless;
      always verify; always encrypt response. **`HEAD`:** verify + run handler +
      return bodyless `200` with metadata headers.
- [ ] `stream-wrapper.ts` (`withNenStream`) — verify auth for **all** methods (close
      the GET auth hole); accept bodyless **incl. `GET`**; decrypt body only when
      present.
- [ ] Add `X-Nen-Nonce` to the header constants.

**`@withnen/client`**
- [ ] `errors.ts` — mirror `ISO-3005` (client subset).
- [ ] `index.ts` — `nenFetch` + `nenStream`: **always** generate a nonce → send as
      `X-Nen-Nonce`; request body becomes `{ ct }` (drop `n` from body); canonical
      string uses the header nonce. Add a `client.nenHead()` (or document
      `nenFetch(url, { method: 'HEAD' })`) returning the decrypted-free metadata.

**Docs**
- [ ] `PROTOCOL.md` → bump to `NEN-PROTOCOL-V2`; rewrite §4; add the method matrix and
      the query-string boundary (§6 here); document `ISO-3005`, `HEAD`, streaming
      `GET`.
- [ ] `apps/www` MDX: `docs/protocol`, `docs/usage`, `docs/api`, `docs/architecture`;
      refresh the "read paths must use POST" notes (now obsolete).
- [ ] `apps/www/public/llms.txt` — update per-request format + method matrix.
- [ ] `ERROR_CODES.md` — add `ISO-3005` (canonical), keep all three catalogs in
      lockstep.

**Tests / bench**
- [ ] `nen-server/__tests__` — encrypted `GET` and `DELETE` round-trips; streaming-
      `GET` auth test; `HEAD` auth + bodyless-response test; missing-`X-Nen-Nonce` →
      `ISO-3005` test.
- [ ] `bench/regression.js` — flip "GET-with-body limitation documented" into
      "encrypted GET round-trips"; update `apps/www` notes routes to real `GET`.

**Release**
- [ ] Bump `@withnen/{client,server,ai}` → `0.3.0`; `npm publish`; bump
      `apps/www` deps to `0.3.0`; redeploy.

## 9. Risk & compatibility

- **Wire-breaking:** a `v0.2.x` client against a `v0.3.0` server (or vice-versa)
  fails cleanly at HMAC/wire-format checks — no silent downgrade. Both packages are
  first-party and released together, so there is no third-party straddling a version
  boundary.
- **Surface area:** ~2 client functions, 3 server files, no Wasm change. Contained.
- **Net security posture:** strictly improved — bodyless requests gain real replay
  protection, and the streaming-GET auth gap is closed.
