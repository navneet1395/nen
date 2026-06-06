import {
  Monitor,
  Cloud,
  Network,
  ScrollText,
  Server,
  Database,
  Bot,
  Lock,
  ShieldCheck,
} from "lucide-react";

function Node({
  icon,
  label,
  tone = "ciphertext",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "plaintext" | "ciphertext" | "neutral";
}) {
  const ring =
    tone === "plaintext"
      ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
      : tone === "ciphertext"
        ? "border-primary/40 bg-primary/5 text-primary"
        : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${ring} shadow-sm`}>
        {icon}
      </div>
      <span className="text-[11px] font-medium leading-tight text-foreground/80 max-w-[72px]">
        {label}
      </span>
    </div>
  );
}

function Rail({
  label,
  className,
  colStart,
  colEnd,
  variant,
}: {
  label: string;
  className?: string;
  colStart: number;
  colEnd: number;
  variant: "tls" | "isogeny";
}) {
  const styles =
    variant === "isogeny"
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-zinc-400/40 bg-muted/40 text-muted-foreground";
  const Icon = variant === "isogeny" ? ShieldCheck : Lock;
  return (
    <div
      className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${styles} ${className ?? ""}`}
      style={{ gridColumn: `${colStart} / ${colEnd}` }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </div>
  );
}

/**
 * The trust-boundary pipeline: TLS covers only the first hop; Isogeny keeps the
 * payload as ciphertext across every intermediary, between the two endpoints.
 * Replaces the old ASCII-art <pre> block.
 */
export function TrustBoundaryDiagram() {
  return (
    <div className="not-prose w-full overflow-x-auto rounded-2xl border border-border/60 bg-background/60 p-6 md:p-8">
      <div className="grid min-w-[640px] grid-cols-6 items-center gap-x-2">
        {/* connecting line behind the nodes */}
        <div className="relative col-span-6">
          <div className="absolute left-[8%] right-[8%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-amber-500/40 via-primary/50 to-amber-500/40" />
          <div className="grid grid-cols-6 gap-x-2">
            <Node icon={<Monitor className="h-5 w-5" />} label="Browser" tone="plaintext" />
            <Node icon={<Cloud className="h-5 w-5" />} label="CDN" tone="ciphertext" />
            <Node icon={<Network className="h-5 w-5" />} label="Edge / LB" tone="ciphertext" />
            <Node icon={<ScrollText className="h-5 w-5" />} label="Proxy / Logs" tone="ciphertext" />
            <Node icon={<Server className="h-5 w-5" />} label="App" tone="plaintext" />
            <Node icon={<Database className="h-5 w-5" />} label="DB / 3rd-party" tone="neutral" />
          </div>
        </div>

        {/* endpoint markers */}
        <div className="col-span-6 mt-3 grid grid-cols-6 gap-x-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Endpoint A
          </span>
          <span className="col-span-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Endpoint B
          </span>
          <span />
        </div>

        {/* rails */}
        <div className="col-span-6 mt-3 grid grid-cols-6 gap-x-2 gap-y-2">
          <Rail variant="tls" label="TLS · encrypts the channel" colStart={1} colEnd={3} />
          <Rail
            variant="isogeny"
            label="Isogeny · payload stays ciphertext"
            colStart={2}
            colEnd={6}
          />
        </div>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        TLS covers the first hop, then terminates. Isogeny keeps the payload encrypted across every
        intermediary between the two endpoints — the endpoints themselves hold plaintext by design.
      </p>
    </div>
  );
}

/**
 * The Secure-AI flow: prompt encrypted in the browser, ciphertext across the
 * customer's own infra, decrypted only at their backend (which then calls the
 * provider, who necessarily sees plaintext).
 */
export function AiFlowDiagram() {
  return (
    <div className="not-prose w-full overflow-x-auto rounded-2xl border border-border/60 bg-background/60 p-6 md:p-8">
      <div className="grid min-w-[600px] grid-cols-4 items-center gap-x-2">
        <div className="relative col-span-4">
          <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary/50 via-primary/50 to-amber-500/40" />
          <div className="grid grid-cols-4 gap-x-2">
            <Node icon={<Monitor className="h-5 w-5" />} label="Browser" tone="plaintext" />
            <Node icon={<Cloud className="h-5 w-5" />} label="Your CDN / edge / logs" tone="ciphertext" />
            <Node icon={<Server className="h-5 w-5" />} label="Your backend" tone="plaintext" />
            <Node icon={<Bot className="h-5 w-5" />} label="Model provider" tone="neutral" />
          </div>
        </div>

        <div className="col-span-4 mt-3 grid grid-cols-4 gap-x-2 gap-y-2">
          <Rail variant="isogeny" label="Encrypted · prompt is ciphertext" colStart={1} colEnd={3} />
          <Rail variant="tls" label="Decrypts, then calls the model" colStart={3} colEnd={5} />
        </div>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        The prompt is ciphertext from the browser across your own infrastructure. Your backend
        decrypts it and calls the provider — who must see plaintext to run inference. Isogeny hides the
        prompt from your stack, not from the model.
      </p>
    </div>
  );
}
