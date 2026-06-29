import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { SequenceDiagram } from "@/components/sequence-diagram";
import { buttonVariants } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

import Link from "next/link";

export const metadata = {
  title: "Why not just use Cloudflare / HTTPS? | Nen",
  description:
    "TLS protects the channel; Nen protects the payload. Cloudflare and AWS already ship post-quantum TLS for free — but the payload becomes plaintext the instant TLS terminates. Here is exactly where Nen is additive, and where it is not.",
  keywords: [
    "post-quantum readiness",
    "application-layer encryption for APIs",
    "TLS vs payload encryption",
    "Cloudflare post-quantum",
  ],
};

export default function WhyNotCloudflare() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 w-full">
        <section className="w-full py-20 md:py-28 px-4 relative overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              &ldquo;Why not just use Cloudflare or HTTPS?&rdquo;
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-2">
              It is the first question every security engineer asks. Here is the
              honest answer.
            </p>
          </div>
        </section>

        <article className="max-w-5xl mx-auto px-4 pb-24">
          {/* The one-liner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 my-10">
            <p className="text-2xl font-bold leading-snug">
              TLS protects the <span className="text-primary">channel</span>.
              Nen protects the <span className="text-primary">payload</span>
              .
            </p>
            <p className="text-muted-foreground/80 mt-4 leading-relaxed">
              Your data is encrypted in transit (TLS), but <em>naked</em> the
              instant TLS terminates — in your CDN, your load balancer, your
              logs, your proxies, and any third-party hop. Nen keeps the
              payload as ciphertext across all of that, all the way to the
              application code that actually needs it.
            </p>
          </div>

          {/* Honest concession */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-4">
            Cloudflare and AWS already give you post-quantum TLS — for free
          </h2>
          <p className="text-muted-foreground/80 leading-relaxed mb-4">
            We are not going to pretend otherwise. Post-quantum key agreement at
            the TLS layer is a finalized NIST standard, shipped by
            trillion-dollar companies with zero developer effort. By late 2025
            roughly 43% of human-generated traffic to Cloudflare was already
            PQ-protected.{" "}
            <strong className="text-foreground/80">
              If your only concern is the public transit leg, you may not need
              Nen.
            </strong>
          </p>
          <p className="text-muted-foreground/80 leading-relaxed">
            Nen is a{" "}
            <strong className="text-foreground/80">different threat model</strong>,
            not a competing one. We are additive on purpose: we defend the
            surface TLS structurally cannot reach — everything that happens{" "}
            <em>after</em> the channel is decrypted.
          </p>

          {/* The gap diagram */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-4">
            What survives TLS termination
          </h2>
          <p className="text-muted-foreground/80 leading-relaxed mb-6">
            The moment TLS terminates — at the load balancer, the CDN edge, the
            serverless runtime — the payload becomes plaintext and stays that
            way as it flows through:
          </p>
          <ul className="space-y-3 mb-8">
            {[
              "Application logs and observability pipelines",
              "Databases and caches (often multi-tenant)",
              "The cloud provider's process memory",
              "Every third-party API the request is forwarded to",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <span>
                  <span className="text-foreground/80 font-medium">{item}</span>
                  <span className="text-muted-foreground/80">
                    {" "}
                    — not covered by post-quantum TLS.
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="w-full my-8">
            <SequenceDiagram
              participants={[
                { id: "client", name: "Browser", type: "client" },
                { id: "cdn", name: "CDN / Edge", type: "server" },
                { id: "proxy", name: "Proxy / Logs", type: "server" },
                { id: "app", name: "Your API", type: "server" }
              ]}
              steps={[
                { id: "1", from: "client", to: "cdn", label: "TLS (Channel Encrypted)", color: "muted" },
                { id: "2", from: "cdn", to: "proxy", label: "TLS", color: "muted" },
                { id: "3", from: "proxy", to: "app", label: "TLS", color: "muted" },
                { id: "4", from: "client", to: "app", label: "Nen (Payload Ciphertext E2E)", animated: true, color: "primary" }
              ]}
            />
          </div>

          {/* Comparison table */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-6">
            Side by side
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="p-4 font-semibold text-foreground/80">Concern</th>
                  <th className="p-4 font-semibold text-foreground/80">
                    PQ-TLS (Cloudflare / AWS)
                  </th>
                  <th className="p-4 font-semibold text-foreground/80">Nen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <ComparisonRow
                  concern="Public transit leg, browser → edge"
                  tls="yes"
                  nen="redundant"
                  nenNote="TLS already covers this"
                />
                <ComparisonRow
                  concern="Payload in logs after termination"
                  tls="no"
                  nen="yes"
                />
                <ComparisonRow
                  concern="Payload at rest in DB / queue"
                  tls="no"
                  nen="yes"
                />
                <ComparisonRow
                  concern="Internal hops not behind PQ-TLS"
                  tls="no"
                  nen="yes"
                />
                <ComparisonRow
                  concern="Third-party forwarders / proxies"
                  tls="no"
                  nen="yes"
                />
                <ComparisonRow
                  concern="Harvest-now-decrypt-later on at-rest payloads"
                  tls="no"
                  nen="yes"
                />
                <ComparisonRow
                  concern="A compromised terminating server"
                  tls="no"
                  nen="no"
                  nenNote="endpoints hold plaintext by design"
                />
                <ComparisonRow
                  concern="Hiding plaintext from a recipient you send it to"
                  tls="no"
                  nen="no"
                  nenNote="needs TEE / FHE — out of scope"
                />
              </tbody>
            </table>
          </div>

          {/* HNDL precise claim */}
          <h2 className="text-2xl font-bold tracking-tight mt-12 mb-4">
            On harvest-now-decrypt-later, precisely
          </h2>
          <p className="text-muted-foreground/80 leading-relaxed mb-4">
            PQ-TLS already defends the transit leg against HNDL — for free. So
            Nen&apos;s HNDL value is{" "}
            <strong className="text-foreground/80">specifically</strong> for:
          </p>
          <ul className="space-y-3 mb-4">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground/80">
                payloads that come to{" "}
                <span className="text-foreground/80">rest still encrypted</span>{" "}
                (logs, queues, DBs you choose not to decrypt), and
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span className="text-muted-foreground/80">
                legs <span className="text-foreground/80">not</span> behind PQ-TLS
                (internal hops, third-party calls, older infra).
              </span>
            </li>
          </ul>
          <p className="text-muted-foreground/80 leading-relaxed">
            We do not claim HNDL protection that PQ-TLS already provides on the
            public transit leg. Overlapping that claim is how we&apos;d lose
            credibility with the exact buyer we want.
          </p>

          {/* CTA */}
          <div className="rounded-2xl border border-border glass-strong p-8 mt-14 text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-3 text-foreground">
              Read the proof, not just the pitch
            </h2>
            <p className="text-muted-foreground/80 mb-6 max-w-xl mx-auto">
              The threat model and protocol spec are public. The compliance
              buyer reads these before trusting anyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/docs/threat-model"
                className={buttonVariants({ variant: "default" })}
              >
                Threat model
              </Link>
              <Link
                href="/docs/protocol"
                className={buttonVariants({ variant: "outline" })}
              >
                Protocol spec
              </Link>
              <Link
                href="/docs/quickstart"
                className={buttonVariants({ variant: "outline" })}
              >
                Quickstart <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

function Cell({
  kind,
  note,
}: {
  kind: "yes" | "no" | "redundant";
  note?: string;
}) {
  if (kind === "yes") {
    return (
      <span className="inline-flex items-center gap-1.5 text-primary font-medium">
        <Check className="w-4 h-4" /> Yes
        {note && (
          <span className="text-muted-foreground/60 font-normal text-xs">
            ({note})
          </span>
        )}
      </span>
    );
  }
  if (kind === "redundant") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
        Redundant
        {note && (
          <span className="text-muted-foreground/60 font-normal text-xs">
            — {note}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-red-400 font-medium">
      <X className="w-4 h-4" /> No
      {note && (
        <span className="text-muted-foreground/60 font-normal text-xs">
          ({note})
        </span>
      )}
    </span>
  );
}

function ComparisonRow({
  concern,
  tls,
  nen,
  nenNote,
}: {
  concern: string;
  tls: "yes" | "no" | "redundant";
  nen: "yes" | "no" | "redundant";
  nenNote?: string;
}) {
  return (
    <tr className="hover:bg-muted/20">
      <td className="p-4 font-medium text-foreground/70">{concern}</td>
      <td className="p-4">
        <Cell kind={tls} />
      </td>
      <td className="p-4">
        <Cell kind={nen} note={nenNote} />
      </td>
    </tr>
  );
}
