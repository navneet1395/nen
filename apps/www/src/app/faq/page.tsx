import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "FAQ | Nen — Post-Quantum Payload Encryption",
  description:
    "Honest answers to the hardest questions about Nen: what it protects that Cloudflare doesn't, harvest-now-decrypt-later, performance overhead, compliance, the open-source trap, and more.",
  openGraph: {
    title: "FAQ | Nen",
    description:
      "Honest answers to the hardest questions about Nen: what it protects, why not Cloudflare, compliance, performance, and more.",
    url: "https://withnen.com/faq",
  },
};

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const SECTIONS: FAQSection[] = [
  {
    title: "Security & Threat Model",
    items: [
      {
        q: "What does Nen protect that Cloudflare, AWS Shield, or HTTPS already covers?",
        a: (
          <>
            <p>
              TLS — including Cloudflare&apos;s post-quantum TLS — encrypts the{" "}
              <em>channel</em> between two network hops. The moment your HTTPS request hits a
              CDN edge node, a load balancer, or your own origin server, TLS terminates and the
              payload is plaintext. That plaintext is then written to logs, stored in a database,
              forwarded to a third-party API, and held in cloud-provider memory.
            </p>
            <p className="mt-3">
              Nen encrypts the <em>payload</em> — the JSON body — end-to-end between the two
              application endpoints that actually need the data. TLS termination, CDN inspection,
              log pipelines, multi-tenant databases, and internal proxies all see ciphertext only.
              Cloudflare cannot offer this because it is the TLS terminator.
            </p>
            <p className="mt-3">
              The short version: <strong>TLS + Nen</strong>, not TLS or Nen.
            </p>
          </>
        ),
      },
      {
        q: "What is 'harvest now, decrypt later' and why does it matter today — not in 10 years?",
        a: (
          <>
            <p>
              Nation-state adversaries and well-funded criminal groups are currently recording
              encrypted traffic in bulk. The bet: a cryptographically-relevant quantum computer
              will arrive within 10–15 years and retroactively decrypt everything collected today.
              This is not speculative — NSA and CISA advisories from 2022–2024 explicitly name it
              as an active collection strategy.
            </p>
            <p className="mt-3">
              For most data this is irrelevant. For financial records, medical histories, legal
              communications, and AI prompts containing PII, a 10-year exposure window is
              catastrophically long. The time to encrypt under ML-KEM is before the data leaves
              your app — which is now, not when quantum computers ship.
            </p>
          </>
        ),
      },
      {
        q: "What exactly are Nen's trust boundaries? What does it NOT protect?",
        a: (
          <>
            <p>
              <strong>Nen protects the payload in transit between two application endpoints.</strong>{" "}
              Every hop in between — CDN, load balancer, log pipeline, database, third-party API,
              multi-tenant infrastructure — sees only ciphertext.
            </p>
            <p className="mt-3">Nen does <em>not</em> protect against:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>A fully compromised browser or runtime environment</li>
              <li>XSS that executes in the same origin</li>
              <li>Stolen session tokens (rotate frequently; use short TTLs)</li>
              <li>Malicious endpoint logic — the endpoint decrypts by design</li>
              <li>The model provider seeing your AI prompts (inference needs plaintext)</li>
            </ul>
            <p className="mt-3">
              The threat model is published in full at{" "}
              <a href="/docs/threat-model" className="text-primary hover:underline">
                /docs/threat-model
              </a>
              .
            </p>
          </>
        ),
      },
      {
        q: "What if ML-KEM (Kyber) has a vulnerability? Doesn't that break everything?",
        a: (
          <>
            <p>
              ML-KEM is FIPS 203, finalized by NIST in August 2024 after an eight-year public
              competition and multiple independent cryptanalysis rounds. It is as battle-tested as
              any standard gets before widespread deployment.
            </p>
            <p className="mt-3">
              Even if a theoretical weakness were found in ML-KEM, Nen&apos;s architecture limits the
              blast radius: the shared secret is used as a ChaCha20-Poly1305 key, and every session
              has forward secrecy via key rotation. A compromised session key does not compromise
              past sessions. The symmetric cipher (ChaCha20-Poly1305) is independent of ML-KEM and
              is not quantum-vulnerable at any practical key size.
            </p>
            <p className="mt-3">
              We follow NIST advisories. If a parameter-set downgrade is recommended, the session
              handshake version field allows a clean protocol upgrade without breaking the wire
              format.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "vs. Alternatives",
    items: [
      {
        q: "What if Vercel or Cloudflare ships a PQC application-layer middleware tomorrow?",
        a: (
          <>
            <p>
              The platform threat is real and worth naming honestly. Our answer is three-part:
            </p>
            <ol className="list-decimal list-inside mt-3 space-y-2 text-muted-foreground">
              <li>
                <strong>Platform middleware enforces your trust in the platform.</strong> If your
                payload is encrypted at the Cloudflare Worker or Vercel Edge Function layer, Vercel
                and Cloudflare hold the keys. Nen keeps keys at your application endpoints — the
                only two parties that need the data.
              </li>
              <li>
                <strong>Next.js-first, but not Vercel-only.</strong> Nen runs on any Node.js or
                Edge runtime: Fly.io, Railway, AWS Lambda, bare VMs. A platform-native solution
                creates lock-in; Nen does not.
              </li>
              <li>
                <strong>The SDK moat compounds over time.</strong> Dev experience, compliance
                artifacts, audit-ready documentation, and the session management layer are not
                things a CDN middleware ships. The cipher is a commodity; the platform is not.
              </li>
            </ol>
          </>
        ),
      },
      {
        q: "Why not just implement ML-KEM ourselves using an open-source library?",
        a: (
          <>
            <p>
              You can — and for a security-focused team, reading the FIPS 203 spec is a reasonable
              exercise. The problem is the layer above the cipher: session management, nonce
              tracking, replay prevention, HMAC-authenticated requests, key rotation, error
              handling, and a wire format that survives load balancers and CDNs.
            </p>
            <p className="mt-3">
              Each of those pieces has well-known failure modes. The session store must be shared
              across instances (InMemory fails in multi-node deployments). The HMAC canonical string
              must cover the right fields (missing the path means a path-swap attack). Nonces must
              be tracked per-session, not globally. Key rotation must not disrupt in-flight
              requests.
            </p>
            <p className="mt-3">
              Nen ships the cipher plus the protocol — tested, documented, and auditable as a unit.
              The alternative is building and auditing each piece yourself and getting the
              integration right under production load.
            </p>
          </>
        ),
      },
      {
        q: "We already use mTLS / service mesh encryption internally. Why do we need Nen?",
        a: (
          <>
            <p>
              mTLS encrypts the transport channel between services — which is great. But it still
              terminates at each service boundary. The JSON body that your API service writes to
              PostgreSQL, passes to an analytics pipeline, or forwards to an LLM provider is
              plaintext from the moment it arrives at that service.
            </p>
            <p className="mt-3">
              Nen is orthogonal to mTLS: use both. mTLS secures the internal channels; Nen ensures
              the payload itself stays ciphertext across every log line, database row, and
              third-party call that originates from those services.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Compliance & Regulations",
    items: [
      {
        q: "Which specific regulation requires PQC today? HIPAA, GDPR, PCI-DSS don't name it.",
        a: (
          <>
            <p>
              No regulation names ML-KEM by algorithm today — and that&apos;s not the right frame. The
              right question is: <em>which regulations impose a forward-looking adequacy standard?</em>
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-muted-foreground">
              <li>
                <strong>HIPAA</strong> requires &quot;reasonable and appropriate&quot; technical
                safeguards. An OCR auditor asking about your encryption posture in 2026, after NIST
                published FIPS 203, has a higher adequacy bar than in 2020.
              </li>
              <li>
                <strong>NIST SP 800-131A Rev 3 (2024)</strong> explicitly disallows RSA and ECDH
                for new key establishment after 2030 and recommends transitioning to ML-KEM now.
                FedRAMP systems must comply.
              </li>
              <li>
                <strong>NSA CNSA 2.0</strong> mandates ML-KEM for National Security Systems by
                2030; new systems should use it now.
              </li>
              <li>
                <strong>EU NIS2 Directive (2024)</strong> requires state-of-the-art cryptographic
                measures for operators of essential services.
              </li>
            </ul>
            <p className="mt-3">
              More practically: if your security team fills out a vendor questionnaire that asks
              &quot;Are you PQC-ready?&quot; the answer should be yes and demonstrable. Nen provides
              the demonstrable part — a signed audit artifact showing which endpoints encrypted
              payloads with ML-KEM-768 and when.
            </p>
          </>
        ),
      },
      {
        q: "How does Nen handle data-residency requirements (GDPR, India DPDPA, etc.)?",
        a: (
          <>
            <p>
              Nen does not route traffic through any Nen-operated infrastructure — there is no
              relay, no proxy, no SaaS middleman. The payload goes directly from your client to
              your server. Session state (the encrypted shared secret and nonce cache) lives in
              whichever store you choose:{" "}
              <code className="font-mono text-sm">InMemorySessionStore</code>,{" "}
              <code className="font-mono text-sm">RedisSessionStore</code>, or{" "}
              <code className="font-mono text-sm">UpstashSessionStore</code>.
            </p>
            <p className="mt-3">
              If your Redis is in Frankfurt, your session keys are in Frankfurt. Nen inherits your
              existing data-residency posture rather than adding a new jurisdiction.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Performance & Operations",
    items: [
      {
        q: "How much latency does Nen add? What's the overhead per request?",
        a: (
          <>
            <p>
              The handshake is the expensive step: one ML-KEM key generation + encapsulation. On a
              modern CPU, ML-KEM-768 key generation takes ~70µs and encapsulation ~90µs — total
              handshake crypto under 200µs, dominated by the network round trip to{" "}
              <code className="font-mono text-sm">/api/nen/handshake</code>. The handshake happens
              once per session (not per request).
            </p>
            <p className="mt-3">
              Per request: ChaCha20-Poly1305 encryption + HMAC-SHA256. ChaCha20 benchmarks at{" "}
              ~3 GB/s on a single core; for a 10 KB JSON payload that is under 5µs. HMAC-SHA256
              over the canonical string (method + path + timestamp + nonce, typically under 200
              bytes) is under 1µs. Total per-request crypto overhead: <strong>under 10µs</strong>{" "}
              for payloads up to ~100 KB.
            </p>
            <p className="mt-3">
              The Wasm binary (~120 KB gzipped) is loaded once at startup, not per request.
              Session store lookups (Redis/Upstash) add one network call per request — the same
              trade-off as any authenticated session system.
            </p>
          </>
        ),
      },
      {
        q: "Does session management overhead make Nen impractical for high-frequency APIs?",
        a: (
          <>
            <p>
              Session state per request is a single key-value lookup in your store — the same
              cost as reading a JWT signing key or session cookie from Redis. If you&apos;re running
              10,000 RPS, you&apos;re already doing this.
            </p>
            <p className="mt-3">
              The nonce cache (for replay prevention) is the only unbounded structure, and it is
              scoped per session with a 30-second window. The store evicts nonces when the session
              is rotated or terminated. High-frequency streaming is served by{" "}
              <code className="font-mono text-sm">withNenStream</code>, which issues one nonce per
              stream rather than per chunk.
            </p>
            <p className="mt-3">
              If your API makes 100 encrypted calls per second per client, the overhead is
              100 Redis reads + 100 ChaCha20 encrypt/decrypt cycles. For most applications the
              session store latency is the dominant cost, and it is shared with your existing auth
              layer.
            </p>
          </>
        ),
      },
      {
        q: "What happens to in-flight requests during a key rotation?",
        a: (
          <>
            <p>
              <code className="font-mono text-sm">client.rotate()</code> calls{" "}
              <code className="font-mono text-sm">/api/nen/rotate</code>, which atomically
              creates a new session entry and marks the old one for immediate expiry on the server.
              The client then atomically swaps its internal session to the new keys.
            </p>
            <p className="mt-3">
              Requests that were in flight at the moment of rotation with the old session ID will
              get an <code className="font-mono text-sm">ISO-2002</code> (session invalid) response
              from the server. The client SDK retries those automatically with the new session.
              This is a one-time hiccup of at most one RPC per in-flight request at rotation time.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Business, Licensing & Open Source",
    items: [
      {
        q: "Why pay for Nen if the SDK is open source?",
        a: (
          <>
            <p>
              The SDK is open-source and always will be. What you pay for is the layer that makes
              it production-grade for a security-conscious organization:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-muted-foreground">
              <li>
                <strong>Cloud dashboard:</strong> session telemetry, rotation history, error
                tracking, and alert thresholds across all your endpoints.
              </li>
              <li>
                <strong>Audit logs:</strong> cryptographic proof that endpoint X encrypted
                payloads with ML-KEM-768 between date A and date B — the artifact an auditor needs.
              </li>
              <li>
                <strong>Enterprise controls:</strong> KMS/HSM integration, SAML SSO, role-based
                access, SLA-backed support, signed compliance attestations.
              </li>
            </ul>
            <p className="mt-3">
              The open-source strategy is deliberate: adoption earns trust; trust earns the
              enterprise conversation. A CISO who already has the SDK running in production needs a
              purchase order for the compliance artifact, not a proof-of-concept.
            </p>
          </>
        ),
      },
      {
        q: "What happens if Nen (the company) is acquired or shuts down?",
        a: (
          <>
            <p>
              The SDK is MIT-licensed on GitHub. If Nen disappears, you own the code and the
              protocol spec (published in{" "}
              <a href="/docs/protocol" className="text-primary hover:underline">
                PROTOCOL.md
              </a>
              ). You can fork, self-host, and maintain it indefinitely. There is no phone-home,
              no activation key, no usage metering in the SDK itself.
            </p>
            <p className="mt-3">
              The paid cloud dashboard is the only component that depends on Nen infrastructure.
              Enterprise customers receive a data-export SLA and a 12-month wind-down window in
              their contract — audit logs are exportable at any time in a structured format.
            </p>
          </>
        ),
      },
      {
        q: "Is this the right time to adopt a new cryptographic library? The ecosystem feels early.",
        a: (
          <>
            <p>
              ML-KEM-768 is FIPS 203 — a finalized federal standard, not a research paper. The
              RustCrypto crates Nen uses (
              <code className="font-mono text-sm">ml-kem</code>,{" "}
              <code className="font-mono text-sm">chacha20poly1305</code>
              ) have been in use in production systems since 2022 and are maintained by the same
              community that maintains ring and rustls.
            </p>
            <p className="mt-3">
              The question is not &quot;is the crypto ready?&quot; — it is. The question is
              &quot;what is the cost of waiting?&quot; Every payload transmitted under RSA or ECDH
              today is a harvest candidate. Regulations are moving faster than most engineering
              roadmaps. The organizations that wait for a &quot;mature ecosystem&quot; are the ones
              who will face the first enforcement actions.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: "Secure AI",
    items: [
      {
        q: "How does the Nen AI SDK protect prompts? Doesn't the model provider still see them?",
        a: (
          <>
            <p>
              Yes — the model provider (OpenAI, Anthropic, etc.) receives plaintext prompts and
              returns plaintext tokens. That is unavoidable: inference requires plaintext.
            </p>
            <p className="mt-3">
              What Nen protects is the path <em>from the browser to your backend</em>: the prompt
              that a user types into your SaaS product, the context your app appends, and the
              streamed response tokens on the way back. Without Nen, that data is plaintext across
              your CDN, load balancer, application log, and any internal proxy between your Next.js
              server and your users.
            </p>
            <p className="mt-3">
              The trust boundary: <strong>browser ↔ your backend</strong> is encrypted by Nen.{" "}
              <strong>your backend ↔ model provider</strong> is TLS only (Nen does not and cannot
              encrypt that hop). For FinTech, Healthcare, and Legal AI products handling PII or
              privileged information, the browser-to-backend leg is where the exposure lives today.
            </p>
          </>
        ),
      },
      {
        q: "We use an AI gateway or proxy (e.g. LiteLLM, Portkey). Does Nen break that?",
        a: (
          <>
            <p>
              Nen encrypts between your browser client and your Next.js backend server — it does
              not touch the hop from your backend to the AI gateway. Your backend decrypts the
              prompt, calls the gateway (over TLS), and encrypts the streamed response before
              sending it back to the browser.
            </p>
            <p className="mt-3">
              Your AI gateway sees plaintext prompts exactly as it does today. Nen adds E2EE on
              the user-facing leg; it is orthogonal to whatever infrastructure you have between
              your backend and the model provider.
            </p>
          </>
        ),
      },
    ],
  },
];

// Build JSON-LD FAQPage schema from the sections
function buildFAQJsonLd(sections: FAQSection[]) {
  const entities = sections.flatMap((s) =>
    s.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        // We strip the JSX to a plain text approximation for JSON-LD
        text: item.q,
      },
    }))
  );
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entities,
  };
}

export default function FAQPage() {
  const jsonLd = buildFAQJsonLd(SECTIONS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="pt-20 pb-12 px-4 border-b border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">
              FAQ
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Hard questions,{" "}
              <span className="text-primary">honest answers</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We collected the sharpest objections from security engineers, CISOs, and investors
              and answered them directly — without marketing softening.
            </p>
          </div>
        </section>

        {/* FAQ sections */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto space-y-16">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-primary mb-8 border-b border-border/40 pb-3">
                  {section.title}
                </h2>
                <div className="space-y-10">
                  {section.items.map((item) => (
                    <div key={item.q} className="group">
                      <h3 className="text-lg font-semibold text-foreground mb-3 leading-snug">
                        {item.q}
                      </h3>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {item.a}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 border-t border-border/40 bg-muted/20">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-muted-foreground mb-8">
              Read the{" "}
              <a href="/docs/threat-model" className="text-primary hover:underline">
                full threat model
              </a>
              , the{" "}
              <a href="/docs/protocol" className="text-primary hover:underline">
                protocol spec
              </a>
              , or the{" "}
              <a href="/docs" className="text-primary hover:underline">
                developer docs
              </a>
              . If your question isn&apos;t covered, open an issue on GitHub.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/docs/quickstart"
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Get started free
              </a>
              <a
                href="/docs/threat-model"
                className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Read the threat model
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
