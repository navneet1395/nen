import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Roadmap | Nen — Post-Quantum Payload Encryption",
  description:
    "Where Nen is headed: what shipped in NEN-PROTOCOL-V3, what's in progress, what we're exploring, and what we have deliberately decided not to build. No dates — security ships when it's right.",
  openGraph: {
    title: "Roadmap | Nen",
    description:
      "What shipped in V3, what's next, what we're exploring, and the things we deliberately won't build.",
    url: "https://withnen.com/roadmap",
  },
  alternates: { canonical: "https://withnen.com/roadmap" },
};

interface Item {
  title: string;
  body: string;
}

interface Section {
  label: string;
  heading: string;
  tone: "shipped" | "progress" | "exploring" | "wont";
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    label: "Shipped",
    heading: "Available today",
    tone: "shipped",
    items: [
      {
        title: "NEN-PROTOCOL-V3 — hybrid HKDF key schedule",
        body:
          "No key material crosses the wire. Both sides derive k_enc and k_mac with HKDF-SHA256 from a hybrid X25519 + ML-KEM-768 shared secret, so a session stays safe unless both the classical and post-quantum legs break.",
      },
      {
        title: "Session resumption + rekey ratchet",
        body:
          "Sealed resumption tickets re-establish a session without a fresh KEM, and HKDF(k, \"nen/v3 ratchet\") advances keys forward for forward secrecy (client.rekey()).",
      },
      {
        title: "Transcript-bound server identity (ML-DSA-65)",
        body:
          "The server can sign a transcript hash binding the handshake; the client verifies it and rejects tampered or substituted handshakes.",
      },
      {
        title: "Bidirectional, method-agnostic encryption (V2)",
        body:
          "Every method is authenticated and every response is encrypted, bodyless GET/HEAD/DELETE included. Mandatory per-request HMAC over a canonical string, with a stable ISO-xxxx error contract.",
      },
      {
        title: "Secure AI SDK",
        body:
          "createSecureOpenAI / createSecureAnthropic encrypt the browser-to-your-backend hop — keeping prompts out of your own logs and intermediaries (not from the model provider, which needs plaintext to infer).",
      },
    ],
  },
  {
    label: "In progress",
    heading: "Being worked on",
    tone: "progress",
    items: [
      {
        title: "External security review",
        body:
          "Our own KATs, fuzzing, and negative-path tests are green; the next step is independent eyes on the crypto and wire format. Tracked in Audit Readiness.",
      },
      {
        title: "create-nen-app refresh",
        body:
          "Bringing the scaffolding CLI fully in line with the V3 packages so a new project is post-quantum from the first commit.",
      },
      {
        title: "Signed compliance attestation",
        body:
          "An ML-DSA-signed runtime evidence export — the headline of the paid tier — moving toward a managed dashboard.",
      },
    ],
  },
  {
    label: "Exploring",
    heading: "Under consideration (no commitment)",
    tone: "exploring",
    items: [
      {
        title: "Multi-recipient sessions",
        body:
          "An envelope scheme so one encrypted payload can be opened by several independent key-holders. Deferred until a design partner needs it — it requires a key directory and carries real design weight.",
      },
      {
        title: "Post-quantum media confidentiality",
        body:
          "Extending the engine to keep images and video ciphertext through the delivery pipeline for long-secrecy use cases (medical, legal, defense). A dormant feature we'd revive for a specific compliance partner — explicitly not DRM.",
      },
      {
        title: "More framework adapters",
        body:
          "First-class adapters beyond Next.js route handlers as demand appears.",
      },
    ],
  },
  {
    label: "Won't build",
    heading: "Deliberately out of scope",
    tone: "wont",
    items: [
      {
        title: "\"Unstealable\" media / anti-screenshot DRM",
        body:
          "Anything that can be displayed can be screen-recorded — the analog hole. We won't sell a promise physics breaks. (See our notes on why layered/anti-capture schemes don't hold up.)",
      },
      {
        title: "A TLS replacement",
        body:
          "Nen is additive: TLS protects the channel, Nen protects the payload past TLS termination. It is not a VPN and not a TLS substitute.",
      },
      {
        title: "Hiding prompts from the model provider",
        body:
          "Inference needs plaintext. The Secure AI SDK protects your own infrastructure, never the provider boundary — we say so plainly.",
      },
    ],
  },
];

const toneStyles: Record<Section["tone"], string> = {
  shipped: "text-emerald-500",
  progress: "text-primary",
  exploring: "text-amber-500",
  wont: "text-muted-foreground",
};

export default function RoadmapPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        <section className="pt-20 pb-12 px-4 border-b border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">
              Roadmap
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Where Nen is <span className="text-primary">headed</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              What&apos;s shipped, what&apos;s in progress, what we&apos;re exploring — and
              the things we&apos;ve decided <em>not</em> to build. No dates: cryptography
              ships when it&apos;s right, not when a calendar says so.
            </p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto space-y-16">
            {SECTIONS.map((section) => (
              <div key={section.label}>
                <h2 className={`text-xs font-semibold uppercase tracking-widest mb-8 border-b border-border/40 pb-3 ${toneStyles[section.tone]}`}>
                  {section.label} · {section.heading}
                </h2>
                <div className="space-y-10">
                  {section.items.map((item) => (
                    <div key={item.title}>
                      <h3 className="text-lg font-semibold text-foreground mb-3 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-4 border-t border-border/40 bg-muted/20">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Want something prioritized?</h2>
            <p className="text-muted-foreground mb-8">
              The roadmap moves with real use cases. Read the{" "}
              <a href="/docs/protocol" className="text-primary hover:underline">protocol spec</a>{" "}
              or the{" "}
              <a href="/docs/changelog" className="text-primary hover:underline">changelog</a>{" "}
              to see exactly where things stand.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
