import Link from "next/link";

export const metadata = {
  title: "Error codes (ISO-xxxx) reference | Nen Docs",
  description:
    "The complete Nen error-code catalog. Every failure inside the Nen layer carries a stable ISO-xxxx code with its HTTP status, cause, and fix. Deep-linkable per code so support can point you straight at the answer.",
};

interface ErrorCode {
  code: string;
  http: number;
  name: string;
  detail: string;
}

interface ErrorCategory {
  range: string;
  title: string;
  codes: ErrorCode[];
}

const CATEGORIES: ErrorCategory[] = [
  {
    range: "1xxx",
    title: "Handshake / key exchange",
    codes: [
      { code: "ISO-1001", http: 400, name: "HANDSHAKE_MISSING_PUBLIC_KEY", detail: "Handshake body had neither `pk` nor `publicKey`. Client SDK out of date, or the request wasn't made by an Nen client." },
      { code: "ISO-1002", http: 500, name: "HANDSHAKE_FAILED", detail: "ML-KEM encapsulation/decapsulation threw. Malformed/wrong-length public key, or a Wasm load failure." },
      { code: "ISO-1003", http: 503, name: "HANDSHAKE_NETWORK", detail: "Couldn't reach /api/nen/handshake. Wrong serverUrl, server down, or CORS." },
      { code: "ISO-1004", http: 502, name: "HANDSHAKE_BAD_RESPONSE", detail: "Handshake responded non-2xx or without sid/ct. The route isn't wired to handleHandshake()." },
    ],
  },
  {
    range: "2xxx",
    title: "Session lifecycle",
    codes: [
      { code: "ISO-2001", http: 409, name: "SESSION_NOT_INITIALIZED", detail: "nenfetch/nenstream called before a successful handshake()." },
      { code: "ISO-2002", http: 401, name: "SESSION_INVALID_OR_EXPIRED", detail: "Server has no entry for X-Nen-Session. Expired by TTL, evicted, or this node never saw the handshake (use a shared/stateless store)." },
      { code: "ISO-2003", http: 401, name: "SESSION_HEADER_MISSING", detail: "No X-Nen-Session header. Not an Nen client, or a proxy stripped it." },
    ],
  },
  {
    range: "3xxx",
    title: "Authentication (HMAC / identity)",
    codes: [
      { code: "ISO-3001", http: 401, name: "AUTH_SIGNATURE_MISSING", detail: "No X-Nen-Signature on a session that requires HMAC. HMAC is mandatory — this is the auth-downgrade guard." },
      { code: "ISO-3002", http: 401, name: "AUTH_SIGNATURE_INVALID", detail: "HMAC over METHOD\\nPATH\\nTIMESTAMP\\nNONCE didn't match. Tampered request, wrong key, or a canonical-string mismatch (commonly path-vs-full-URL)." },
      { code: "ISO-3003", http: 401, name: "AUTH_TIMESTAMP_OUT_OF_WINDOW", detail: "X-Nen-Timestamp is >30s from server time. Clock skew or a replayed/delayed request." },
      { code: "ISO-3004", http: 401, name: "AUTH_IDENTITY_SIGNATURE_INVALID", detail: "Optional ML-DSA identity signature over the ephemeral key didn't verify. Wrong identity key or a MITM at handshake." },
    ],
  },
  {
    range: "4xxx",
    title: "Cryptography (AEAD / payload)",
    codes: [
      { code: "ISO-4001", http: 400, name: "CRYPTO_DECRYPT_FAILED", detail: "ChaCha20-Poly1305 AEAD tag verification failed. Tampered/truncated ciphertext, or a desynced shared secret (try rotate())." },
      { code: "ISO-4002", http: 500, name: "CRYPTO_ENCRYPT_FAILED", detail: "AEAD sealing of the response threw. Usually a corrupt/missing shared secret." },
      { code: "ISO-4003", http: 400, name: "CRYPTO_PAYLOAD_NOT_JSON", detail: "Decryption succeeded but the plaintext wasn't valid JSON." },
    ],
  },
  {
    range: "5xxx",
    title: "Replay / nonce",
    codes: [
      { code: "ISO-5001", http: 409, name: "REPLAY_NONCE_REUSED", detail: "This nonce was already seen for the session. A legitimate identical retry, or an actual replay." },
    ],
  },
  {
    range: "6xxx",
    title: "Wire format / encoding",
    codes: [
      { code: "ISO-6001", http: 400, name: "WIRE_INVALID_PAYLOAD_FORMAT", detail: "Body was missing the (ct, n) base64 pair. Not an Nen payload, or a corrupted/truncated body." },
      { code: "ISO-6002", http: 400, name: "WIRE_DECODE_FAILED", detail: "base64 decode of ct/n/pk failed. Truncated by a proxy, or non-base64 data." },
    ],
  },
  {
    range: "7xxx",
    title: "Streaming",
    codes: [
      { code: "ISO-7001", http: 502, name: "STREAM_MISSING_NONCE_HEADER", detail: "Stream response had no X-Nen-Stream-Nonce. The route didn't use withNenStream(), or a proxy stripped it." },
      { code: "ISO-7002", http: 502, name: "STREAM_REQUEST_FAILED", detail: "Stream response was non-ok or had no body. Upstream handler errored before streaming." },
    ],
  },
  {
    range: "9xxx",
    title: "Internal / unknown",
    codes: [
      { code: "ISO-9000", http: 500, name: "INTERNAL", detail: "Unclassified failure wrapped by NenError.from(). The original error is in the logged detail." },
    ],
  },
];

function anchorId(code: string) {
  return code.toLowerCase(); // e.g. "iso-3001" → /docs/error-codes#iso-3001
}

/** Color an HTTP status badge by class: 5xx red, 4xx amber, else muted. */
function statusBadge(http: number) {
  if (http >= 500) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  if (http >= 400) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-transparent";
}

/** Left-accent + ring color for a code card by severity. */
function cardAccent(http: number) {
  if (http >= 500) return "border-l-red-500/70";
  if (http >= 400) return "border-l-amber-500/70";
  return "border-l-border";
}

export default function ErrorCodesPage() {
  return (
    <div className="not-prose">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Error codes</h1>
      <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
        Every failure inside the Nen layer carries a stable{" "}
        <code className="text-primary font-mono">ISO-xxxx</code> code. Paste the code; this page tells
        you exactly what happened and the fix. Each code has its own anchor — deep-link straight to it,
        e.g. <code className="text-primary font-mono">/docs/error-codes#iso-3001</code>.
      </p>

      {/* category jump list */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <a
            key={cat.range}
            href={`#${cat.range}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs hover:border-primary/50 hover:text-primary transition-colors"
          >
            <span className="font-mono text-primary">{cat.range}</span>
            <span className="text-muted-foreground">{cat.title}</span>
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-5 mb-10 text-sm text-muted-foreground leading-relaxed">
        The wire/HTTP body is always{" "}
        <code className="text-foreground font-mono">{`{ "error": { "code", "message" } }`}</code> — a
        safe, generic message only. The precise diagnosis below is logged server-side as a{" "}
        <em>hint</em> and is never sent over the wire. Codes are a stable contract: never reused or
        renumbered. The single source of truth is{" "}
        <code className="text-foreground font-mono">ERROR_CODES.md</code>, mirrored by both SDK{" "}
        <code className="text-foreground font-mono">errors.ts</code> catalogs.
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat.range} id={cat.range} className="mb-12 scroll-mt-24">
          <h2 className="text-2xl font-bold tracking-tight mb-5 flex items-baseline gap-3">
            <span className="font-mono text-primary text-lg">{cat.range}</span>
            {cat.title}
          </h2>
          <div className="flex flex-col gap-4">
            {cat.codes.map((c) => (
              <div
                key={c.code}
                id={anchorId(c.code)}
                className={`group scroll-mt-24 rounded-xl border border-l-4 border-border/60 bg-background p-5 target:ring-2 target:ring-red-500/20 ${cardAccent(c.http)}`}
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <a
                    href={`#${anchorId(c.code)}`}
                    className="font-mono font-bold text-lg text-red-600 dark:text-red-400 hover:underline"
                  >
                    {c.code}
                  </a>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(c.http)}`}
                  >
                    HTTP {c.http}
                  </span>
                  <code className="text-sm text-foreground/80 font-mono">{c.name}</code>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="rounded-xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-2">Programmatic lookup</p>
        <p className="mb-3">
          Both SDKs export a reverse lookup so tooling and support can resolve a code from a log:
        </p>
        <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">{`import { describeNenCode } from '@nen/server'; // or '@nen/client'

describeNenCode('ISO-3001');
// → { code: 'ISO-3001', status: 401, message: '…', hint: '…' }`}</pre>
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        See also the{" "}
        <Link href="/docs/protocol" className="text-primary hover:underline">
          protocol spec
        </Link>{" "}
        and the{" "}
        <Link href="/docs/threat-model" className="text-primary hover:underline">
          threat model
        </Link>
        .
      </p>
    </div>
  );
}
