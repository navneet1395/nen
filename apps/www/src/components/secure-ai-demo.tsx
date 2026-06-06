"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  ShieldCheck,
  Wifi,
  RefreshCw,
  Lock,
  Unlock,
  ChevronRight,
  Circle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Illustrative crypto helpers (same approach as PayloadDemo — not real crypto)
// ---------------------------------------------------------------------------

function toB64(plain: string, seed = 0): string {
  const data = new TextEncoder().encode(plain);
  const out = new Uint8Array(data.length + 16);
  for (let i = 0; i < data.length; i++)
    out[i] = data[i] ^ ((i * 73 + seed * 17 + 19) & 0xff);
  for (let i = data.length; i < out.length; i++)
    out[i] = (i * 131 + seed + 7) & 0xff;
  let bin = "";
  out.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function shortB64(len = 24, seed = 0): string {
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = (i * 97 + seed * 53 + 11) & 0xff;
  let bin = "";
  arr.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

// ---------------------------------------------------------------------------
// Example prompts — fintech / healthcare / legal AI (the target customers)
// ---------------------------------------------------------------------------

const EXAMPLES = [
  {
    label: "FinTech",
    color: "text-blue-500",
    prompt:
      "Summarise the risk profile for account 8821: balance $142k, 3 late payments in 90 days, FICO 618.",
    response:
      "Account 8821 presents an elevated credit risk. The combination of a FICO score of 618, $142,000 in exposed balance, and three late payments within the past 90 days places this account in the high-risk tier.\n\nRecommended actions: flag for manual review, reduce credit limit to $80,000, and initiate a 30-day payment-behaviour watch. Do not extend new credit lines until two consecutive on-time payments are recorded.",
  },
  {
    label: "Healthcare",
    color: "text-emerald-500",
    prompt:
      "Patient ptn_4491: HbA1c 8.2%, fasting glucose 196 mg/dL. Suggest a management plan.",
    response:
      "Patient ptn_4491 meets criteria for poorly-controlled Type 2 Diabetes. With HbA1c at 8.2% (target <7%) and fasting glucose at 196 mg/dL, the current regimen appears insufficient.\n\nRecommended plan: intensify metformin to 2000 mg/day if tolerated, add an SGLT-2 inhibitor (empagliflozin 10 mg) for cardiorenal benefit, and schedule a dietitian referral. Re-check HbA1c and renal panel in 90 days.",
  },
  {
    label: "Legal AI",
    color: "text-violet-500",
    prompt:
      "Draft a one-paragraph indemnification clause for a SaaS agreement covering third-party IP infringement.",
    response:
      'Each party ("Indemnifying Party") shall defend, indemnify, and hold harmless the other party from any claims arising out of a third-party allegation that the Indemnifying Party\'s product infringes any patent, copyright, trademark, or trade secret, provided the indemnified party: (a) promptly notifies the Indemnifying Party in writing; (b) grants sole control of the defence and settlement; and (c) provides reasonable cooperation at the Indemnifying Party\'s expense.',
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | "idle"
  | "handshaking"
  | "encrypting"
  | "streaming"
  | "done";

interface WireEntry {
  id: number;
  kind:
    | "handshake-req"
    | "handshake-res"
    | "request"
    | "sse-frame"
    | "sse-fin";
  label: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SecureAIDemo() {
  const [exampleIdx, setExampleIdx] = useState(0);
  const [prompt, setPrompt] = useState(EXAMPLES[0].prompt);
  const [phase, setPhase] = useState<Phase>("idle");

  // Chat output — decrypted tokens
  const [tokens, setTokens] = useState<string>("");
  // Network inspector — wire entries
  const [wire, setWire] = useState<WireEntry[]>([]);

  const abortRef = useRef(false);
  const wireRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const sid = useRef(shortB64(9, 42));
  const hmacKey = useRef(shortB64(32, 99));

  // Auto-scroll wire inspector
  useEffect(() => {
    if (wireRef.current)
      wireRef.current.scrollTop = wireRef.current.scrollHeight;
  }, [wire]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [tokens]);

  const addWire = useCallback((entry: Omit<WireEntry, "id">) => {
    setWire((prev) => [...prev, { ...entry, id: prev.length }]);
  }, []);

  const delay = (ms: number) =>
    new Promise<void>((res) => setTimeout(res, ms));

  const run = useCallback(async () => {
    if (phase !== "idle" && phase !== "done") return;
    abortRef.current = false;

    const ex = EXAMPLES[exampleIdx];
    const promptText = prompt || ex.prompt;
    const encryptedPrompt = toB64(promptText, exampleIdx * 7 + 3);
    const nonce = shortB64(12, exampleIdx * 13 + 5);
    const sig = shortB64(32, exampleIdx * 19 + 7);
    const baseStreamNonce = shortB64(12, exampleIdx * 23 + 11);

    setTokens("");
    setWire([]);
    setPhase("handshaking");

    // 1. Handshake request
    await delay(120);
    addWire({
      kind: "handshake-req",
      label: "→ POST /api/nen/handshake",
      detail: `{ "pk": "${shortB64(24, 1)}…" }`,
    });

    await delay(320);
    addWire({
      kind: "handshake-res",
      label: "← 200 Handshake OK",
      detail: `{ "sid": "${sid.current.slice(0, 10)}…", "ct": "${shortB64(24, 2)}…", "hmac": "${hmacKey.current.slice(0, 10)}…" }`,
    });

    if (abortRef.current) return;
    setPhase("encrypting");
    await delay(260);

    // 2. Encrypted request
    addWire({
      kind: "request",
      label: "→ POST /api/ai/chat",
      detail: [
        `x-nen-session: ${sid.current.slice(0, 12)}…`,
        `x-nen-nonce:   ${nonce.slice(0, 12)}…`,
        `x-nen-signature: ${sig.slice(0, 12)}…`,
        `body: { "ct": "${encryptedPrompt.slice(0, 28)}…",`,
        `        "n":  "${nonce.slice(0, 16)}…" }`,
      ].join("\n"),
    });

    if (abortRef.current) return;
    setPhase("streaming");
    await delay(420);

    // 3. SSE stream header
    addWire({
      kind: "sse-frame",
      label: "← 200 text/event-stream",
      detail: `x-nen-stream-nonce: ${baseStreamNonce}`,
    });

    // 4. Stream response tokens + SSE frames in parallel
    const words = ex.response.split(" ");
    const CHUNK_SIZE = 3; // words per SSE frame
    let chunkIdx = 0;

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      if (abortRef.current) return;

      const chunk = words.slice(i, i + CHUNK_SIZE).join(" ") + " ";
      const frameCt = toB64(chunk, chunkIdx * 37 + 3);

      // Show SSE frame on wire
      addWire({
        kind: "sse-frame",
        label: `← data: [frame ${chunkIdx}]`,
        detail: `data: ${frameCt.slice(0, 36)}…`,
      });

      // Append decrypted tokens character by character
      for (const char of chunk) {
        if (abortRef.current) return;
        setTokens((t) => t + char);
        await delay(char === "\n" ? 60 : 18);
      }

      chunkIdx++;
      await delay(40);
    }

    if (abortRef.current) return;

    // 5. FIN sentinel
    addWire({
      kind: "sse-fin",
      label: "← data: __FIN__",
      detail: `data: ${toB64("__FIN__", 999).slice(0, 36)}…`,
    });

    setPhase("done");
  }, [phase, exampleIdx, prompt, addWire]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setTokens("");
    setWire([]);
  }, []);

  const selectExample = (idx: number) => {
    if (phase === "streaming" || phase === "handshaking" || phase === "encrypting") return;
    setExampleIdx(idx);
    setPrompt(EXAMPLES[idx].prompt);
    setTokens("");
    setWire([]);
    setPhase("idle");
  };

  const isRunning =
    phase === "handshaking" || phase === "encrypting" || phase === "streaming";

  // Wire entry styling
  const wireKindStyle: Record<WireEntry["kind"], string> = {
    "handshake-req":
      "border-border/60 bg-muted/50 text-foreground/80 dark:bg-muted/20",
    "handshake-res":
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
    "request":
      "border-primary/30 bg-primary/10 text-primary/90 dark:border-primary/20 dark:bg-primary/80 dark:text-primary-foreground",
    "sse-frame":
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400",
    "sse-fin":
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  };

  const phaseLabel: Record<Phase, string> = {
    idle: "Ready",
    handshaking: "ML-KEM handshake…",
    encrypting: "Encrypting prompt…",
    streaming: "Streaming (ciphertext on wire)…",
    done: "Complete",
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-background/70 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Secure AI Demo</span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            createSecureOpenAI
          </span>
        </div>

        {/* Phase badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              phase === "done"
                ? "text-emerald-700 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                : phase === "idle"
                ? "text-muted-foreground border-border bg-muted/50 dark:bg-muted/20"
                : "text-primary border-primary/30 bg-primary/10 dark:border-primary/20 dark:bg-primary/10"
            }`}
          >
            {isRunning && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
            )}
            {phaseLabel[phase]}
          </span>

          {(phase === "done" || isRunning) && (
            <button
              onClick={reset}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Example Tabs ── */}
      <div className="flex gap-1 px-4 pt-3 pb-0">
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex.label}
            onClick={() => selectExample(i)}
            disabled={isRunning}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold border-b-2 transition-all ${
              exampleIdx === i
                ? `border-primary text-foreground bg-muted/50`
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <span className={ex.color}>{ex.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main split pane ── */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* ── Left: Prompt + Response (what YOUR APP sees) ── */}
        <div className="flex flex-col p-4 gap-3 min-h-[420px]">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Unlock className="w-3 h-3" />
            Your app sees (plaintext)
          </div>

          {/* Prompt input */}
          <div className="rounded-lg border border-border bg-background">
            <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              rows={4}
              spellCheck={false}
              className="w-full bg-transparent px-3 pb-3 text-[12px] font-mono text-foreground focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Send button */}
          <button
            onClick={isRunning ? undefined : phase === "done" ? reset : run}
            disabled={isRunning}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              isRunning
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
            }`}
          >
            {phase === "done" ? (
              <>
                <RefreshCw className="w-4 h-4" /> Try again
              </>
            ) : isRunning ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                {phaseLabel[phase]}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send encrypted
              </>
            )}
          </button>

          {/* Response area */}
          <div className="flex-1 rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col">
            <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              Response
            </div>
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto p-3 text-[12px] leading-relaxed font-mono text-foreground min-h-[100px] max-h-[200px] whitespace-pre-wrap"
            >
              {tokens || (
                <span className="text-muted-foreground/50 italic text-[11px]">
                  Decrypted response will appear here…
                </span>
              )}
              {phase === "streaming" && (
                <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Network Inspector (what the WIRE sees) ── */}
        <div className="flex flex-col p-4 gap-3 min-h-[420px] bg-background/50">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock className="w-3 h-3 text-primary" />
            Wire sees (ciphertext only)
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
              handshake
            </span>
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-primary text-primary" />
              request
            </span>
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-violet-500 text-violet-500" />
              SSE frame
            </span>
            <span className="flex items-center gap-1">
              <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
              FIN sentinel
            </span>
          </div>

          {/* Wire entries */}
          <div
            ref={wireRef}
            className="flex-1 overflow-y-auto flex flex-col gap-1.5 max-h-[340px] pr-1"
          >
            {wire.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground/40 italic">
                <Wifi className="w-4 h-4 mr-1.5" />
                No traffic yet — hit Send to watch the wire
              </div>
            )}

            {wire.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-md border px-2.5 py-2 text-[10px] font-mono leading-relaxed ${wireKindStyle[entry.kind]}`}
                style={{ animation: "fadeSlideIn 0.18s ease" }}
              >
                <div className="font-semibold mb-0.5 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />
                  {entry.label}
                </div>
                <div className="opacity-70 whitespace-pre-wrap break-all pl-4">
                  {entry.detail}
                </div>
              </div>
            ))}
          </div>

          {/* Honest footnote */}
          <div className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2 mt-auto">
            <span className="text-primary font-semibold">Illustrative ciphertext.</span>{" "}
            Real payloads use ChaCha20-Poly1305 over an ML-KEM-768 shared secret.
            Your CDN, edge, logs, and proxies see exactly this — base64 blobs, nothing readable.
          </div>
        </div>
      </div>
    </div>
  );
}
