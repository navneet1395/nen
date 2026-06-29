"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * The hero gut-punch: the SAME request, before and after Nen.
 * Standard fetch() leaves the body as readable plaintext that every CDN, log,
 * and proxy can read. nenFetch() turns it into ciphertext + signed headers.
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
  for (let i = 0; i < data.length; i++)
    out[i] = data[i] ^ ((i * 73 + 19) & 0xff);
  for (let i = data.length; i < out.length; i++) out[i] = (i * 131 + 7) & 0xff;
  return base64(out);
}

function deriveNonce(plain: string): string {
  const out = new Uint8Array(12);
  for (let i = 0; i < 12; i++)
    out[i] = (plain.charCodeAt(i % Math.max(plain.length, 1)) + i * 41) & 0xff;
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
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-border bg-muted/20 backdrop-blur-xl shadow-2xl overflow-hidden text-left glow-blue-sm">
      {/* premium segmented control toggle */}
      <div className="flex items-center gap-1 p-1.5 bg-muted/30 border-b border-border relative">
        <button
          type="button"
          onClick={() => setSecure(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setSecure(false);
          }}
          className={`cursor-pointer flex-1 relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            !secure
              ? " shadow-sm"
              : "text-muted-foreground/80 "
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {!secure && (
            <div className="absolute inset-0 bg-muted/50 rounded-lg shadow-sm -z-10 pointer-events-none" />
          )}
          <EyeOff className="w-4 h-4" /> Standard{" "}
          <code className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">
            fetch()
          </code>
        </button>
        <button
          type="button"
          onClick={() => setSecure(true)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setSecure(true);
          }}
          className={`cursor-pointer flex-1 relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
            secure
              ? "text-primary-foreground shadow-md"
              : "text-muted-foreground/80  hover:bg-muted/30"
          }`}
          style={{ touchAction: "manipulation" }}
        >
          {secure && (
            <div className="absolute inset-0 bg-primary rounded-lg shadow-md -z-10 pointer-events-none" />
          )}
          {!secure && (
            <span className="absolute -top-1 right-0 flex h-3 w-3 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
          <ShieldCheck className="w-4 h-4" /> Nen{" "}
          <code
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${secure ? "bg-primary-foreground/20" : "bg-muted/50"}`}
          >
            nenFetch()
          </code>
        </button>
      </div>

      <div className="grid md:grid-cols-2">
        {/* What you write — editable */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-border bg-muted/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              <span>What you write</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400/80 bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              Live Editable
            </div>
          </div>
          <pre className="text-[11px] font-mono text-muted-foreground/60 mb-2 leading-relaxed">{`${secure ? "nenFetch" : "fetch"}("/api/claims", {
  method: "POST",
  body:`}</pre>
          <div className="relative group">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              rows={6}
              className="cursor-text w-full bg-[var(--code-bg)] border border-border rounded-lg px-3 py-2.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400/80 focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-inner resize-none leading-relaxed transition-all group-hover:border-primary/20"
            />
          </div>
          <pre className="text-[11px] font-mono text-muted-foreground/60 mt-2">{`});`}</pre>
        </div>

        {/* What the wire sees */}
        <div className="p-5 bg-muted/10 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
            <span>What your CDN, logs &amp; proxies see</span>
          </div>

          <div
            className={`transition-all duration-500 ${!secure ? "opacity-100 translate-y-0" : "opacity-0 absolute translate-y-4 pointer-events-none"}`}
          >
            <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 font-mono text-[11px] text-red-700 dark:text-red-300/80 break-all whitespace-pre-wrap leading-relaxed min-h-[150px] shadow-sm">
              {body}
            </div>
            <div className="flex items-start gap-2 mt-4 text-[11px] text-red-700 dark:text-red-300/80 bg-red-400/5 p-2.5 rounded-md border border-red-400/15">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="leading-relaxed">
                <strong>Plaintext visible.</strong> TLS protected it in transit,
                but it terminates at the edge. This payload now sits entirely
                readable in your logs, your CDN, and every proxy.
              </span>
            </div>
          </div>

          <div
            className={`transition-all duration-500 ${secure ? "opacity-100 translate-y-0" : "opacity-0 absolute translate-y-4 pointer-events-none"}`}
          >
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 font-mono text-[10px] sm:text-[11px] text-primary/80 break-all whitespace-pre-wrap leading-relaxed min-h-[150px] shadow-sm">
              <span className="text-muted-foreground/60">x-nen-session:</span>{" "}
              sid_3f9a…
              {"\n"}
              <span className="text-muted-foreground/60">
                x-nen-nonce:
              </span>{" "}
              {nonce}
              {"\n"}
              <span className="text-muted-foreground/60">
                x-nen-signature:
              </span>{" "}
              {sig}…{"\n\n"}
              <span className="text-muted-foreground/60">body:</span>
              {"\n"}
              <span className="text-foreground/80 font-bold">
                {chunk(ciphertext, 40)}
              </span>
            </div>
            <div className="flex items-start gap-2 mt-4 text-[11px] text-primary/80 bg-primary/5 p-2.5 rounded-md border border-primary/15">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="leading-relaxed">
                <strong>End-to-End Ciphertext.</strong> ChaCha20-Poly1305 over
                an ML-KEM-768 shared secret. Only the terminal API endpoint you
                trust can read this.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 bg-muted/10 border-t border-border text-xs text-muted-foreground/60">
        <Eye className="w-3.5 h-3.5" />
        Edit the body — it&apos;s your data. Toggle above to watch it disappear
        from the wire.
      </div>
    </div>
  );
}
