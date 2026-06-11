import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { buttonVariants } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing | Nen",
  description:
    "Nen is open-source and free to run. Pay when you need the dashboard, audit logs, and exportable compliance evidence your auditor asks for. Three tiers: OSS, Cloud, and Enterprise.",
};

interface Tier {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: "Open Source",
    price: "$0",
    tagline: "The full SDK. The protection, free forever.",
    cta: "Start Building",
    href: "/docs/quickstart",
    features: [
      "@withnen/client + @withnen/server",
      "ML-KEM-768 + ChaCha20-Poly1305",
      "Mandatory per-request HMAC",
      "Encrypted SSE streaming (nenStream)",
      "In-memory & Redis session stores",
      "Public protocol spec & threat model",
    ],
  },
  {
    name: "Cloud",
    price: "$79",
    cadence: "/mo",
    tagline: "See every session, rotation, and error in one place.",
    cta: "Start free trial",
    href: "/docs/quickstart",
    featured: true,
    features: [
      "Everything in Open Source",
      "Live session & key-rotation dashboard",
      "Error-rate & latency monitoring",
      "Searchable audit logs",
      "Upstash / edge session backends",
      "Email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "The proof your auditor signs off on.",
    cta: "Talk to us",
    href: "mailto:sales@withnen.com",
    features: [
      "Everything in Cloud",
      "Exportable compliance evidence (ML-KEM-768 per endpoint, timestamped)",
      "HSM / KMS integration",
      "SAML / SSO",
      "Dedicated support & SLA",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 w-full">
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-background to-muted/30 px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
            Free to protect. Pay for the proof.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The open-source SDK gives you the encryption with no limits. The paid tiers give you the
            visibility and the exportable compliance evidence a regulated buyer needs.
          </p>
        </section>

        <section className="w-full pb-24 px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 items-start">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  tier.featured
                    ? "border-primary shadow-xl shadow-primary/10 bg-background scale-[1.02]"
                    : "border-border/60 bg-background/60"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-bold mb-1">{tier.name}</h2>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                  {tier.cadence && (
                    <span className="text-muted-foreground text-sm">{tier.cadence}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">{tier.tagline}</p>

                <Link
                  href={tier.href}
                  className={buttonVariants({
                    variant: tier.featured ? "default" : "outline",
                    className: "w-full font-semibold mb-8",
                  })}
                >
                  {tier.cta} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>

                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12 max-w-xl mx-auto">
            Not sure you need Nen at all? We say so plainly on the{" "}
            <Link href="/why-not-cloudflare" className="text-primary hover:underline">
              &ldquo;why not Cloudflare&rdquo;
            </Link>{" "}
            page — if your only concern is the public transit leg, PQ-TLS already has you covered.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
