"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * The hero gut-punch: the SAME request, before and after Isogeny.
 * Standard fetch() leaves the body as readable plaintext that every CDN, log,
 * and proxy can read. pqcfetch() turns it into ciphertext + signed headers.
 *
 * The ciphertext here is illustrative (a visual transform of the plaintext) —
 * the real thing is ChaCha20-Poly1305 over an ML-KEM shared secret.
 */

const DEFAULT_BODY = `{
  "patient_id": "ptn_8821",
  "ssn": "412-55-9087",
  "diagnosis": "Type 2 Diabetes",
  "balance_due": 1840.00
}`;

function base64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  // btoa exists in the browser; this is a client component.
  return btoa(bin);
}

function toCiphertext(plain: string): string {
  const data = new TextEncoder().encode(plain);
  const out = new Uint8Array(data.length + 16); // + a pretend 16-byte AEAD tag
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ((i * 73 + 19) & 0xff);
  for (let i = data.length; i < out.length; i++) out[i] = (i * 131 + 7) & 0xff;
  return base64(out);
}

function deriveNonce(plain: string): string {
  const out = new Uint8Array(12);
  for (let i = 0; i < 12; i++) out[i] = (plain.charCodeAt(i % Math.max(plain.length, 1)) + i * 41) & 0xff;
  return base64(out);
}

function chunk(s: string, n: number): string {
  return s.replace(new RegExp(`(.{${n}})`, "g"), "$1\n");
}

export function PayloadDemo() {
  const [secure, setSecure] = useState(false);
  const [body, setBody] = useState(DEFAULT_BODY);

  const ciphertext = useMemo(() => toCiphertext(body), [body]);
  const nonce = useMemo(() => deriveNonce(body), [body]);
  const sig = useMemo(() => toCiphertext(body + "sig").slice(0, 44), [body]);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-border bg-background/70 backdrop-blur-md shadow-2xl overflow-hidden text-left">
      {/* toggle */}
      <div className="flex items-center gap-1 p-1.5 bg-muted/40 border-b border-border">
        <button
          onClick={() => setSecure(false)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            !secure ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <EyeOff className="w-4 h-4" /> Standard <code className="font-mono text-xs">fetch()</code>
        </button>
        <button
          onClick={() => setSecure(true)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            secure ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Isogeny <code className="font-mono text-xs">pqcfetch()</code>
        </button>
      </div>

      <div className="grid md:grid-cols-2">
        {/* What you write — editable */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-border">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            <span>What you write</span>
            <span className="text-[10px] font-normal normal-case text-muted-foreground/70">(editable)</span>
          </div>
          <pre className="text-xs font-mono text-muted-foreground mb-2 leading-relaxed">{`${secure ? "pqcfetch" : "fetch"}("/api/claims", {
  method: "POST",
  body:`}</pre>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={6}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner resize-none leading-relaxed"
          />
          <pre className="text-xs font-mono text-muted-foreground mt-2">{`});`}</pre>
        </div>

        {/* What the wire sees */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            <span>What your CDN, logs &amp; proxies see</span>
          </div>

          {!secure ? (
            <div>
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive/90 break-all whitespace-pre-wrap leading-relaxed min-h-[150px]">
                {body}
              </div>
              <div className="flex items-start gap-2 mt-3 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Readable. TLS protected it in transit, then terminated — this plaintext now sits in
                  your logs, your database, and every proxy in between.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 font-mono text-[11px] text-primary/90 break-all whitespace-pre-wrap leading-relaxed min-h-[150px]">
                <span className="text-muted-foreground">x-isogeny-session:</span> sid_3f9a…
                {"\n"}
                <span className="text-muted-foreground">x-isogeny-nonce:</span> {nonce}
                {"\n"}
                <span className="text-muted-foreground">x-isogeny-signature:</span> {sig}…
                {"\n\n"}
                <span className="text-muted-foreground">body:</span>
                {"\n"}
                {chunk(ciphertext, 40)}
              </div>
              <div className="flex items-start gap-2 mt-3 text-xs text-primary">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Ciphertext. ChaCha20-Poly1305 over an ML-KEM-768 shared secret — only the one
                  endpoint you trust can read it. Same one-line change.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">
        <Eye className="w-3.5 h-3.5" />
        Edit the body — it&apos;s your data. Toggle above to watch it disappear from the wire.
      </div>
    </div>
  );
}
