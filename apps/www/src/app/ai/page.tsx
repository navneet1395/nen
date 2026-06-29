import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { buttonVariants } from "@/components/ui/button";
import { SequenceDiagram } from "@/components/sequence-diagram";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { SecureAIDemo } from "@/components/secure-ai-demo";

import { CodeBlock } from "@/components/code-block";
import Link from "next/link";

export const metadata = {
  title: "Secure AI — Encrypt LLM prompts across your stack | Nen",
  description:
    "Nen encrypts AI prompts and streamed tokens end-to-end from the user's browser to your own backend — your CDN, edge, logs, and proxies see only ciphertext. Honest scope: it does not hide prompts from the model provider, which must decrypt to run inference. For encrypt-LLM-prompts compliance.",
  keywords: [
    "encrypt LLM prompts compliance",
    "secure AI SDK",
    "encrypted streaming",
    "post-quantum readiness",
  ],
};

export default function AIPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 w-full">
        <section className="w-full py-20 md:py-28 px-4 relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-6 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> The v1 wedge — Secure AI SDK
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              Encrypt LLM prompts{" "}
              <span className="gradient-text">across your own stack</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Prompts and streamed tokens stay ciphertext from the user&apos;s
              browser to the one backend service you trust to call the model —
              your edge, CDN, logs, and proxies never see them in plaintext.
            </p>
          </div>
        </section>

        <article className="max-w-5xl mx-auto px-4 pb-24">
          {/* Code */}
          <div className="my-10">
            <CodeBlock>{`const ai = createSecureOpenAI({ /* ... */ });

const stream = ai.chat.completions.stream({
  messages,
});

// prompts and streamed tokens are E2E-encrypted from the
// browser to YOUR backend — their edge, CDN, logs, and
// proxies see only ciphertext.`}</CodeBlock>
          </div>
          <p className="text-sm text-muted-foreground/80 -mt-4 mb-10">
            Drop-in shapes mirroring the official SDKs —{" "}
            <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">createSecureOpenAI</code> and{" "}
            <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">createSecureAnthropic</code> — built on the same
            transport-agnostic core as <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">nenFetch</code> and{" "}
            <code className="text-primary/80 bg-muted/50 px-1.5 py-0.5 rounded text-sm">nenStream</code>.
          </p>

          {/* The honest framing — this is the critical section */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-6">
            What this honestly protects (and what it doesn&apos;t)
          </h2>
          <p className="text-muted-foreground/80 leading-relaxed mb-8">
            This is the claim most easily overstated, so we pin it down. Read
            this section before you read the marketing.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Check className="w-5 h-5" /> Protected
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground/80 leading-relaxed">
                The prompt/response is ciphertext from the user&apos;s browser,
                through your CDN, edge, load balancer, and logging, all the way
                to the backend that terminates Nen. That backend is where
                prompts stop being exposed to{" "}
                <strong className="text-foreground/80">
                  your own infrastructure and any intermediary
                </strong>
                .
              </CardContent>
            </Card>
            <Card className="border-red-400/20 bg-red-400/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <X className="w-5 h-5" /> Not protected by ML-KEM alone
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground/80 leading-relaxed">
                Hiding the prompt from the{" "}
                <strong className="text-foreground/80">model provider</strong>{" "}
                (OpenAI, Anthropic, etc.). The provider <em>must</em> see
                plaintext to run inference — you cannot do inference on
                ciphertext. We will never claim &ldquo;the provider never sees
                your prompts.&rdquo;
              </CardContent>
            </Card>
          </div>

          <div className="rounded-2xl border border-border glass-strong p-6 md:p-8 my-8">
            <p className="text-lg leading-relaxed text-foreground/80">
              The honest pitch:{" "}
              <em className="text-white">
                &ldquo;Your users&apos; prompts never appear in plaintext
                anywhere across your own stack — your edge, your logs, your
                proxies, your vendors-in-the-middle — only inside the one
                service you trust to call the model.&rdquo;
              </em>
            </p>
            <p className="text-sm text-muted-foreground/80 mt-4">
              For teams that also need to hide prompts from the provider, the
              self-host / TEE path is a separate, later capability — never an
              implied default.
            </p>
          </div>

          {/* Flow */}
          <div className="w-full">
            <SequenceDiagram
              participants={[
                { id: "client", name: "Client App", type: "client" },
                { id: "cdn", name: "CDN & Logs", type: "server" },
                { id: "backend", name: "Your Backend", type: "server" },
                { id: "llm", name: "OpenAI / Anthropic", type: "database" },
              ]}
              steps={[
                {
                  id: "1",
                  from: "client",
                  to: "cdn",
                  label: "Nen Encrypted Prompt",
                  animated: true,
                  color: "primary",
                },
                {
                  id: "2",
                  from: "cdn",
                  to: "backend",
                  label: "Forward Encrypted Payload",
                  animated: true,
                  color: "primary",
                },
                {
                  id: "3",
                  from: "backend",
                  to: "llm",
                  label: "Plaintext Prompt",
                  animated: true,
                  color: "muted",
                },
              ]}
            />
          </div>

          {/* Why this wedge wins */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-4">
            Why AI is the wedge
          </h2>
          <ul className="space-y-3 mb-6">
            {[
              "AI apps already stream sensitive data — prompts, PHI, legal context, financial records — through many hops of your own infrastructure.",
              "Health, legal, and fintech AI companies feel this pain today and carry budget and compliance urgency.",
              "Secure streaming is a rare, defensible niche — most PQC projects stop at request/response. nenStream already does chunked, authenticated SSE.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground/80">{item}</span>
              </li>
            ))}
          </ul>

          {/* Live demo */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-2">
            Live demo
          </h2>
          <p className="text-muted-foreground/80 mb-6 text-sm leading-relaxed">
            Pick a scenario, hit <strong className="text-foreground/80">Send encrypted</strong>, and watch the split view: your app sees decrypted tokens streaming in on the left; the wire — your CDN, edge, and logs — sees only base64 ciphertext frames on the right.
          </p>
          <SecureAIDemo />

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link
              href="/docs/quickstart"
              className={buttonVariants({ variant: "default" })}
            >
              Quickstart <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            <Link
              href="/docs/threat-model"
              className={buttonVariants({ variant: "outline" })}
            >
              Threat model
            </Link>
            <Link
              href="/why-not-cloudflare"
              className={buttonVariants({ variant: "outline" })}
            >
              Why not Cloudflare?
            </Link>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
