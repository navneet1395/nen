"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Unlock, ImageIcon, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
// Dogfooding: these come from @withnen/seal, re-exported by @withnen/client.
import { generateSealKeypair, sealBlob, openObjectURL, type SealedMedia } from "@withnen/client";

/**
 * A real, in-browser round-trip of Nen's sealed-upload flow:
 *   pick an image → seal it to the "server" public key (ML-KEM-768) in the
 *   browser → show the ciphertext envelope → open it with the secret key.
 *
 * The crypto is the real @withnen/core-crypto Wasm — not an illustration. The
 * server keypair is generated client-side only so the whole loop fits in one
 * page; in production the secret key never leaves your backend.
 */
export function SealDemo() {
  const keys = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [decUrl, setDecUrl] = useState<string | null>(null);
  const [sealed, setSealed] = useState<SealedMedia | null>(null);

  useEffect(() => {
    try {
      keys.current = generateSealKeypair();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => {
      if (origUrl) URL.revokeObjectURL(origUrl);
      if (decUrl) URL.revokeObjectURL(decUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(blob: Blob) {
    if (!keys.current) return;
    setBusy(true);
    setError(null);
    if (origUrl) URL.revokeObjectURL(origUrl);
    if (decUrl) URL.revokeObjectURL(decUrl);
    setDecUrl(null);
    try {
      setOrigUrl(URL.createObjectURL(blob));
      // 1. Browser seals the image to the server's public key.
      const env = await sealBlob(keys.current.publicKey, blob);
      setSealed(env);
      // 2. Holder of the secret key opens it back into a viewable image.
      setDecUrl(openObjectURL(keys.current.secretKey, env));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await run(file);
  }

  async function useSample() {
    const res = await fetch("/icon.png");
    await run(await res.blob());
  }

  const ctPreview = sealed
    ? sealed.envelope.frames.join("").replace(/[^A-Za-z0-9+/]/g, "").slice(0, 220)
    : "";

  return (
    <div className="not-prose my-6 rounded-2xl border border-border/60 bg-muted/20 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/20">
          <ImageIcon className="h-4 w-4 text-primary" />
          Choose an image
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={!ready || busy} />
        </label>
        <button
          onClick={useSample}
          disabled={!ready || busy}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Use sample
        </button>
        {!ready && !error && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading crypto…
          </span>
        )}
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> sealing…
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {/* Original */}
        <Panel title="Original" tone="plain">
          {origUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={origUrl} alt="original" className="h-32 w-full rounded-md object-contain" />
          ) : (
            <Placeholder>Pick an image to start</Placeholder>
          )}
        </Panel>

        {/* Sealed */}
        <Panel title="Sealed (what the CDN sees)" tone="cipher" icon={<Lock className="h-3.5 w-3.5" />}>
          {sealed ? (
            <div className="space-y-2">
              <p className="break-all font-mono text-[10px] leading-relaxed text-muted-foreground/80">
                {ctPreview}…
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{(sealed.size / 1024).toFixed(0)} KB</span>
                <span>{sealed.envelope.frames.length} frame(s)</span>
                <span>ML-KEM-768</span>
              </div>
            </div>
          ) : (
            <Placeholder>ciphertext appears here</Placeholder>
          )}
        </Panel>

        {/* Decrypted */}
        <Panel title="Decrypted (secret key)" tone="plain" icon={<Unlock className="h-3.5 w-3.5" />}>
          {decUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={decUrl} alt="decrypted" className="h-32 w-full rounded-md object-contain" />
          ) : (
            <Placeholder>opens back to the original</Placeholder>
          )}
        </Panel>
      </div>

      <p className="mt-4 inline-flex items-start gap-2 text-xs text-muted-foreground/80">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Real ML-KEM-768 + ChaCha20-Poly1305 in your browser. The image is ciphertext
        the moment it leaves the page — your storage, CDN, and logs only ever see the
        sealed bytes. It is not DRM: whoever is allowed to view it can still capture it.
      </p>
    </div>
  );
}

function Panel({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: "plain" | "cipher";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        tone === "cipher" ? "border-primary/25 bg-primary/5" : "border-border/60 bg-background/40"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/50 text-center text-xs text-muted-foreground/60">
      {children}
    </div>
  );
}
