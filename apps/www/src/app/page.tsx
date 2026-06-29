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
  Sparkles,
} from "lucide-react";
import { SequenceDiagram } from "@/components/sequence-diagram";
import { HeroAnalogies, MobileAnalogiesTicker } from "@/components/hero-analogies";
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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 flex flex-col w-full overflow-x-hidden items-center">
        {/* ───────────────────────── Hero ───────────────────────── */}
        <section className="w-full py-20 md:py-32 flex flex-col items-center text-center px-4 relative overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-primary/4 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative w-full max-w-6xl flex flex-col items-center justify-center mx-auto z-10">
            <HeroAnalogies />

            <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-10 shadow-[0_0_20px_-4px_rgba(178,213,229,0.15)] backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Post-quantum key exchange
              (ML-KEM-768, FIPS 203)
            </div>

            {/* Desktop H1 */}
            <h1 className="hidden md:block text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mb-8 leading-[1.1] relative">
              Your API data is naked the{" "}
              <span className="gradient-text-hero glow-text">moment TLS ends</span>
            </h1>

            {/* Mobile H1 */}
            <div className="block md:hidden w-full relative z-10">
              <MobileAnalogiesTicker />
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed relative z-10">
              HTTPS protects your data in transit — and does it perfectly. But the
              instant TLS terminates, the JSON body lies in plaintext across your
              logs, databases, CDN, proxies, and every third-party hop.{" "}
              <strong className="text-foreground">
                Nen keeps it encrypted the whole way.
              </strong>{" "}
              One line of code. Same TLS you already trust.
            </p>
          </div>

          {/* The gut-punch: before/after on the same request */}
          <div className="w-full mb-12 z-10 relative px-4">
            <PayloadDemo />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-10 relative z-10">
            <Link
              href="/docs/quickstart"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className:
                  "h-12 px-8 font-semibold text-base glow-blue hover:glow-blue-sm transition-all duration-300",
              })}
            >
              Start Building <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/why-not-cloudflare"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "h-12 px-8 font-semibold text-base border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300",
              })}
            >
              &ldquo;Why not just use Cloudflare?&rdquo;
            </Link>
          </div>

          <div className="flex items-center justify-center h-12 px-6 rounded-xl border border-border bg-muted/30 backdrop-blur-md text-muted-foreground font-mono text-sm shadow-xl relative z-10 glow-blue-sm">
            <span className="text-muted-foreground/60 mr-2">$</span>
            <span className="text-primary mr-1.5">npx</span>
            <span>create-nen-app</span>
          </div>
        </section>

        {/* ─────────────────── The problem (tension) ─────────────────── */}
        <section className="w-full relative py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-xs font-semibold bg-muted/30 text-muted-foreground mb-5 backdrop-blur-sm">
                The gap nobody guards
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                TLS did its job. Then it handed off{" "}
                <span className="gradient-text">your plaintext.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                TLS encrypts the channel and stops at termination — the load
                balancer, the CDN edge, the serverless runtime. From there your
                payload travels in the clear. This isn&apos;t a flaw in TLS;
                it&apos;s simply where TLS&apos;s job ends. It&apos;s where
                Nen&apos;s begins.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass shadow-none">
                <CardHeader>
                  <FileWarning className="w-9 h-9 text-primary mb-3" />
                  <CardTitle className="text-foreground/90">Logs &amp; observability</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 text-sm leading-relaxed">
                  Request and response bodies captured in your logging pipeline
                  stay ciphertext — never plaintext PII, PHI, or prompts sitting
                  in a log index.
                </CardContent>
              </Card>
              <Card className="glass shadow-none">
                <CardHeader>
                  <Database className="w-9 h-9 text-primary mb-3" />
                  <CardTitle className="text-foreground/90">Databases &amp; queues</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 text-sm leading-relaxed">
                  Payloads you choose not to decrypt come to rest as ciphertext
                  — and because the key exchange is ML-KEM, they stay safe
                  against harvest-now-decrypt-later.
                </CardContent>
              </Card>
              <Card className="glass shadow-none">
                <CardHeader>
                  <ServerCog className="w-9 h-9 text-primary mb-3" />
                  <CardTitle className="text-foreground/90">Proxies &amp; third-party hops</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 text-sm leading-relaxed">
                  Intermediaries — your CDN, edge, load balancer, internal
                  proxies, and forwarders — see only base64 ciphertext, not the
                  data inside.
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Link
                href="/why-not-cloudflare"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "font-semibold border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300",
                })}
              >
                TLS + Nen, explained <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────── The fix (relief + ease) ─────────────── */}
        <section className="w-full py-24 relative">
          <div className="mx-auto px-6 max-w-5xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                You already wrote <span className="gradient-text">90% of this</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Swap <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">fetch</code> for{" "}
                <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">nenFetch</code> on the client.
                Wrap your route with{" "}
                <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">withNen</code> on the server. The
                handshake, key rotation, HMAC, and replay protection happen
                underneath. About ten lines, start to finish.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="glass rounded-xl p-6">
                <div className="text-xs text-primary/60 mb-3 uppercase tracking-wider font-semibold">
                  Client
                </div>
                <CodeBlock>{`import { nenFetch } from "@withnen/client";

const res = await nenFetch("/api/claims", {
  method: "POST",
  body: JSON.stringify(claim),
});
// payload encrypted before it leaves the tab`}</CodeBlock>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-xs text-primary/60 mb-3 uppercase tracking-wider font-semibold">
                  Server
                </div>
                <CodeBlock>{`import { withNen } from "@withnen/server";

export const POST = withNen(async (req, body) => {
  // body is already decrypted + verified
  return { ok: true };
});
// payload decrypted and ready for processing
`}</CodeBlock>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm text-muted-foreground/80">
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
        <section className="w-full relative py-20">
          <div className="mx-auto px-6 max-w-5xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-5 backdrop-blur-sm">
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Where the trust boundary
                actually sits
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                No overclaims. <span className="gradient-text">Ever.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                A security engineer will find any exaggeration in thirty seconds
                — so we draw the line ourselves.
              </p>
            </div>

            <div className="rounded-2xl glass-strong p-6 md:p-8 mb-8">
              <p className="text-lg leading-relaxed text-foreground/80">
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

            <p className="text-sm text-muted-foreground/80 mt-8">
              What we will <strong className="text-foreground">never</strong>{" "}
              claim: &ldquo;even a compromised server sees only
              ciphertext.&rdquo; The terminating server decrypts — that is the
              point of the middleware. See the{" "}
              <Link
                href="/docs/threat-model"
                className="text-primary hover:underline underline-offset-4"
              >
                full threat model
              </Link>{" "}
              for what Nen does and does not protect against.
            </p>
          </div>
        </section>

        {/* ─────────────── Under the hood: the dashboard (reflective) ─────────────── */}
        <section id="demo" className="w-full py-24 relative">
          <div className="px-6 max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-xs font-semibold bg-muted/30 text-muted-foreground mb-5 backdrop-blur-sm">
                Under the hood
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                What that one line <span className="gradient-text">actually does</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Behind <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">nenFetch</code> is a full post-quantum handshake:
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
        <section className="w-full relative py-20">
          <div className="px-6 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-5 backdrop-blur-sm">
                <Zap className="w-3.5 h-3.5 mr-1.5" /> The wedge — Secure AI
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                Encrypt LLM prompts{" "}
                <span className="gradient-text">across your own stack</span>
              </h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                AI apps stream prompts, PHI, legal context, and financial
                records through many hops of your own infrastructure. Nen
                keeps prompts and streamed tokens as ciphertext from the
                user&apos;s browser to the one backend service you trust to call
                the model.
              </p>
              <p className="text-sm text-muted-foreground/80 mb-8">
                Honest scope: this hides prompts from <em>your</em> edge, logs,
                and proxies. It does{" "}
                <strong className="text-foreground">not</strong> hide them from
                the model provider — they must decrypt to run inference.
              </p>
              <Link
                href="/ai"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "font-semibold border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300",
                })}
              >
                See the Secure AI page <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="glass rounded-xl p-6 font-mono text-sm text-muted-foreground shadow-2xl">
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
        <section className="w-full py-24 relative">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
                Who reaches for <span className="gradient-text">this</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Security and platform engineers at fintech, healthtech, and AI
                companies who just got a PQC-readiness or data-handling audit
                questionnaire — and need documentation and proof as much as
                code.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass shadow-none">
                <CardHeader>
                  <Landmark className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="text-foreground/90">FinTech &amp; Banking</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 leading-relaxed">
                  Keep transaction payloads as ciphertext past TLS termination —
                  through logs, proxies, and at-rest stores — so harvested
                  ciphertext stays safe against future quantum decryption.
                </CardContent>
              </Card>

              <Card className="glass shadow-none">
                <CardHeader>
                  <Stethoscope className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="text-foreground/90">Healthcare</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 leading-relaxed">
                  ePHI stays encrypted from the device to the one service that
                  must read it, shrinking the plaintext-exposed surface your
                  auditor asks about.
                </CardContent>
              </Card>

              <Card className="glass shadow-none">
                <CardHeader>
                  <Building2 className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="text-foreground/90">AI Platforms</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground/80 leading-relaxed">
                  Encrypt prompts and streamed responses across your own
                  infrastructure with secure SSE streaming — a niche most PQC
                  projects never reach.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─────────────── Feature grid ─────────────── */}
        <section className="w-full py-24 relative">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl text-center font-bold tracking-tight mb-4">
              <span className="gradient-text">Features</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
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
                body="nenStream encrypts each chunk with ChaCha20-Poly1305 and an XOR-counter nonce, decrypting tokens as they arrive."
              />
              <Feature
                icon={<ArrowRight className="w-6 h-6 text-primary" />}
                title="Drop-in integration"
                body="withNen middleware and nenFetch client for Next.js App Router — about ten lines from npx create-nen-app to a working handshake."
              />
            </div>
          </div>
        </section>

        {/* ─────────────── Closing CTA ─────────────── */}
        <section className="w-full py-24 relative">
          <div className="max-w-3xl mx-auto px-6 text-center">
            {/* Decorative orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/[0.05] rounded-full blur-[100px] pointer-events-none" />

            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5 relative z-10">
              Keep TLS. Add the part{" "}
              <span className="gradient-text-hero glow-text">it can&apos;t reach.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10 relative z-10 leading-relaxed">
              The free SDK gives you the protection. The docs give you the proof
              your auditor wants. Both ship today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link
                href="/docs/quickstart"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className:
                    "h-12 px-8 font-semibold text-base glow-blue hover:glow-blue-sm transition-all duration-300",
                })}
              >
                Start Building <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/docs/threat-model"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className:
                    "h-12 px-8 font-semibold text-base border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300",
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
    <div className="flex flex-col p-6 glass rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/10">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-3 text-foreground/90">{title}</h3>
      <p className="text-muted-foreground/80 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
