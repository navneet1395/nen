import { buttonVariants } from "@/components/ui/button";
import { PayloadDemo } from "@/components/payload-demo";
import { InteractiveDemo } from "@/components/interactive-demo";
import { BenchmarksDashboard } from "@/components/benchmarks-dashboard";

import { CodeBlock } from "@/components/code-block";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Shield,
  Zap,
  Code2,
  Layers,
  Landmark,
  Stethoscope,
  Building2,
  Database,
  Lock,
  ServerCog,
  FileWarning,
  Check,
} from "lucide-react";
import { SequenceDiagram } from "@/components/sequence-diagram";
import Link from "next/link";

export const metadata = {
  title:
    "Nen | End-to-End Encrypted APIs, Powered by Post-Quantum Cryptography",
  description:
    "TLS keeps your data safe in transit, then terminates. Nen encrypts the API payload that survives termination — your logs, databases, CDN, proxies, and third-party hops see only ciphertext. Application-layer encryption with ML-KEM-768 post-quantum key exchange. TLS + Nen.",
  keywords: [
    "post-quantum readiness",
    "application-layer encryption for APIs",
    "encrypt LLM prompts compliance",
    "end-to-end encrypted APIs",
    "ML-KEM",
    "payload encryption",
  ],
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30 text-foreground">
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center max-w-6xl mx-auto">
        {/* ───────────────────────── Hero ───────────────────────── */}
        <section className="w-full py-20 md:py-28 flex flex-col items-center text-center px-4 relative overflow-hidden">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5 mr-1" /> Post-quantum key exchange
            (ML-KEM-768, FIPS 203)
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 leading-tight">
            Your API data is naked the{" "}
            <span className="text-primary">moment TLS ends</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            HTTPS protects your data in transit — and does it perfectly. But the
            instant TLS terminates, the JSON body lies in plaintext across your
            logs, databases, CDN, proxies, and every third-party hop.{" "}
            <strong className="text-foreground">
              Nen keeps it encrypted the whole way.
            </strong>{" "}
            One line of code. Same TLS you already trust.
          </p>

          {/* The gut-punch: before/after on the same request */}
          <div className="w-full mb-10 z-10 relative">
            <PayloadDemo />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
            <Link
              href="/docs/quickstart"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className:
                  "h-12 px-8 font-semibold text-base shadow-lg shadow-primary/20",
              })}
            >
              Start Building <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/why-not-cloudflare"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-12 px-8 font-semibold text-base",
              })}
            >
              &ldquo;Why not just use Cloudflare?&rdquo;
            </Link>
          </div>

          <div className="flex items-center justify-center h-12 px-6 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 font-mono text-sm shadow-xl">
            <span className="text-zinc-600 mr-2">$</span>
            <span className="text-blue-400 mr-1.5">npx</span>
            <span>create-nen-app</span>
          </div>
        </section>

        {/* ─────────────────── The problem (tension) ─────────────────── */}
        <section className="w-full  relative ">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-muted text-muted-foreground mb-4">
                The gap nobody guards
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                TLS did its job. Then it handed off your plaintext.
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                TLS encrypts the channel and stops at termination — the load
                balancer, the CDN edge, the serverless runtime. From there your
                payload travels in the clear. This isn&apos;t a flaw in TLS;
                it&apos;s simply where TLS&apos;s job ends. It&apos;s where
                Nen&apos;s begins.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <FileWarning className="w-9 h-9 text-primary mb-3" />
                  <CardTitle>Logs &amp; observability</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Request and response bodies captured in your logging pipeline
                  stay ciphertext — never plaintext PII, PHI, or prompts sitting
                  in a log index.
                </CardContent>
              </Card>
              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <Database className="w-9 h-9 text-primary mb-3" />
                  <CardTitle>Databases &amp; queues</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Payloads you choose not to decrypt come to rest as ciphertext
                  — and because the key exchange is ML-KEM, they stay safe
                  against harvest-now-decrypt-later.
                </CardContent>
              </Card>
              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <ServerCog className="w-9 h-9 text-primary mb-3" />
                  <CardTitle>Proxies &amp; third-party hops</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Intermediaries — your CDN, edge, load balancer, internal
                  proxies, and forwarders — see only base64 ciphertext, not the
                  data inside.
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-10">
              <Link
                href="/why-not-cloudflare"
                className={buttonVariants({
                  variant: "outline",
                  className: "font-semibold",
                })}
              >
                TLS + Nen, explained <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────── The fix (relief + ease) ─────────────── */}
        <section className="w-full py-24 relative">
          <div className=" mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                You already wrote 90% of this
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Swap <code>fetch</code> for <code>nenfetch</code> on the client.
                Wrap your route with <code>withNen</code> on the server. The
                handshake, key rotation, HMAC, and replay protection happen
                underneath. About ten lines, start to finish.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div>
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  Client
                </div>
                <CodeBlock>{`import { nenfetch } from "@nen/client";

const res = await nenfetch("/api/claims", {
  method: "POST",
  body: JSON.stringify(claim),
});
// payload encrypted before it leaves the tab`}</CodeBlock>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  Server
                </div>
                <CodeBlock>{`import { withNen } from "@nen/server";

export const POST = withNen(async (req, body) => {
  // body is already decrypted + verified
  return { ok: true };
});
// payload decrypted and ready for processing
`}</CodeBlock>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-sm text-muted-foreground">
              {[
                "Drop-in fetch replacement",
                "Mandatory per-request HMAC",
                "Encrypted SSE streaming",
                "Redis / edge sessions",
              ].map((f) => (
                <span key={f} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" /> {f}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────── Honest trust boundary (trust) ─────────────── */}
        <section className="w-full  relative ">
          <div className=" mx-auto px-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary mb-4">
                <Lock className="w-3.5 h-3.5 mr-1" /> Where the trust boundary
                actually sits
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                No overclaims. Ever.
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A security engineer will find any exaggeration in thirty seconds
                — so we draw the line ourselves.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background p-6 md:p-8 mb-6">
              <p className="text-lg leading-relaxed">
                <strong className="text-foreground">
                  Everything between the two Nen endpoints sees only
                  ciphertext.
                </strong>{" "}
                The two endpoints hold plaintext — by necessity, because someone
                has to read the data. The product&apos;s value is letting you{" "}
                <em className="text-foreground">
                  choose where those endpoints are
                </em>
                , pushing the trust boundary inward past the CDN, edge, load
                balancer, logs, and proxies — down to the specific code that
                genuinely needs the plaintext.
              </p>
            </div>

            <div className="w-full">
              <SequenceDiagram
                participants={[
                  { id: "client", name: "Browser", type: "client" },
                  { id: "cdn", name: "CDN / Edge", type: "server" },
                  { id: "proxy", name: "Proxy / Logs", type: "server" },
                  { id: "app", name: "Your API", type: "server" },
                ]}
                steps={[
                  {
                    id: "1",
                    from: "client",
                    to: "cdn",
                    label: "TLS (Channel Encrypted)",
                    color: "muted",
                  },
                  {
                    id: "2",
                    from: "cdn",
                    to: "proxy",
                    label: "TLS",
                    color: "muted",
                  },
                  {
                    id: "3",
                    from: "proxy",
                    to: "app",
                    label: "TLS",
                    color: "muted",
                  },
                  {
                    id: "4",
                    from: "client",
                    to: "app",
                    label: "Nen (Payload Ciphertext E2E)",
                    animated: true,
                    color: "primary",
                  },
                ]}
              />
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              What we will <strong className="text-foreground">never</strong>{" "}
              claim: &ldquo;even a compromised server sees only
              ciphertext.&rdquo; The terminating server decrypts — that is the
              point of the middleware. See the{" "}
              <Link
                href="/docs/threat-model"
                className="text-primary hover:underline"
              >
                full threat model
              </Link>{" "}
              for what Nen does and does not protect against.
            </p>
          </div>
        </section>

        {/* ─────────────── Under the hood: the dashboard (reflective) ─────────────── */}
        <section className="w-full py-24 relative">
          <div className="  px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-muted text-muted-foreground mb-4">
                Under the hood
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                What that one line actually does
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Behind <code>nenfetch</code> is a full post-quantum handshake:
                an ML-KEM key encapsulation, an optional ML-DSA identity
                signature, and a derived ChaCha20-Poly1305 session. Run it step
                by step — change the payload, change the security level, and
                watch the ciphertext change with it.
              </p>
            </div>

            <InteractiveDemo />
          </div>
        </section>

        <BenchmarksDashboard />

        {/* ─────────────── AI wedge teaser ─────────────── */}
        <section className="w-full  relative">
          <div className=" px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary mb-4">
                <Zap className="w-3.5 h-3.5 mr-1" /> The wedge — Secure AI
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Encrypt LLM prompts across your own stack
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                AI apps stream prompts, PHI, legal context, and financial
                records through many hops of your own infrastructure. Nen
                keeps prompts and streamed tokens as ciphertext from the
                user&apos;s browser to the one backend service you trust to call
                the model.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Honest scope: this hides prompts from <em>your</em> edge, logs,
                and proxies. It does{" "}
                <strong className="text-foreground">not</strong> hide them from
                the model provider — they must decrypt to run inference.
              </p>
              <Link
                href="/ai"
                className={buttonVariants({
                  variant: "outline",
                  className: "font-semibold",
                })}
              >
                See the Secure AI page <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm text-zinc-300 shadow-xl">
              <pre className="whitespace-pre-wrap leading-relaxed">{`const ai = createSecureOpenAI({ /* ... */ });

const stream = ai.chat.completions.stream({
  messages,
});

// prompts and streamed tokens are E2E-encrypted
// from the browser to YOUR backend — your edge,
// CDN, logs, and proxies see only ciphertext.`}</pre>
            </div>
          </div>
        </section>

        {/* ─────────────── Who buys this ─────────────── */}
        <section className="w-full py-24 relative border-t border-border/40">
          <div className=" mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Who reaches for this
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Security and platform engineers at fintech, healthtech, and AI
                companies who just got a PQC-readiness or data-handling audit
                questionnaire — and need documentation and proof as much as
                code.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <Landmark className="w-10 h-10 text-primary mb-4" />
                  <CardTitle>FinTech &amp; Banking</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Keep transaction payloads as ciphertext past TLS termination —
                  through logs, proxies, and at-rest stores — so harvested
                  ciphertext stays safe against future quantum decryption.
                </CardContent>
              </Card>

              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <Stethoscope className="w-10 h-10 text-primary mb-4" />
                  <CardTitle>Healthcare</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  ePHI stays encrypted from the device to the one service that
                  must read it, shrinking the plaintext-exposed surface your
                  auditor asks about.
                </CardContent>
              </Card>

              <Card className="bg-background border-border/50 shadow-sm">
                <CardHeader>
                  <Building2 className="w-10 h-10 text-primary mb-4" />
                  <CardTitle>AI Platforms</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Encrypt prompts and streamed responses across your own
                  infrastructure with secure SSE streaming — a niche most PQC
                  projects never reach.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─────────────── Feature grid ─────────────── */}
        <section className="w-full py-24 relative border-t border-border/40">
          <div className="container  px-4">
            <h2 className="text-3xl text-center font-bold tracking-tight mb-4">
              Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Feature
                icon={<Shield className="w-6 h-6 text-primary" />}
                title="Post-quantum key exchange"
                body="ML-KEM-768 (FIPS 203) for the handshake and ML-DSA-65 (FIPS 204) for opt-in identity. Recorded ciphertext stays safe against harvest-now-decrypt-later."
              />
              <Feature
                icon={<Zap className="w-6 h-6 text-primary" />}
                title="Base64 wire format"
                body="The Wasm core outputs base64 directly — under 1.4x wire bloat versus raw, not the ~4.9x of number-array serialization."
              />
              <Feature
                icon={<Layers className="w-6 h-6 text-primary" />}
                title="Mandatory per-request HMAC"
                body="Every request is signed and verified with HMAC-SHA256 over METHOD, PATH, TIMESTAMP, and NONCE. HMAC is mandatory — the auth-downgrade bypass is closed."
              />
              <Feature
                icon={<Database className="w-6 h-6 text-primary" />}
                title="Edge-ready sessions"
                body="Pluggable SessionStore with in-memory, Redis, and Upstash (REST, no TCP) backends — stateless horizontal scaling, including Edge runtimes like Workers and Vercel Edge."
              />
              <Feature
                icon={<Code2 className="w-6 h-6 text-primary" />}
                title="Encrypted SSE streaming"
                body="nenstream encrypts each chunk with ChaCha20-Poly1305 and an XOR-counter nonce, decrypting tokens as they arrive."
              />
              <Feature
                icon={<ArrowRight className="w-6 h-6 text-primary" />}
                title="Drop-in integration"
                body="withNen middleware and nenfetch client for Next.js App Router — about ten lines from npx create-nen-app to a working handshake."
              />
            </div>
          </div>
        </section>

        {/* ─────────────── Closing CTA ─────────────── */}
        <section className="w-full py-24 border-t">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Keep TLS. Add the part it can&apos;t reach.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              The free SDK gives you the protection. The docs give you the proof
              your auditor wants. Both ship today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/docs/quickstart"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className:
                    "h-12 px-8 font-semibold text-base shadow-lg shadow-primary/20",
                })}
              >
                Start Building <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/docs/threat-model"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-12 px-8 font-semibold text-base",
                })}
              >
                Read the threat model
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col p-6 bg-card rounded-xl border shadow-sm">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
    </div>
  );
}
