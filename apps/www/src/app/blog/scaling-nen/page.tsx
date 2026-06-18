import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Scaling Nen: one box to a global fleet | Nen Blog",
  description:
    "How Nen scales behind load balancers, autoscalers, serverless, gateways, and multiple backends — with zero new code. The session lives in a shared SessionStore, not a process, so the app tier stays stateless and needs no sticky sessions.",
  openGraph: {
    title: "Scaling Nen: one box to a global fleet",
    description:
      "Does payload encryption survive a load-balanced, gateway-fronted fleet? Yes — it's the same stateless-app-tier + shared-store design you already run.",
    url: "https://withnen.com/blog/scaling-nen",
    type: "article",
  },
  alternates: { canonical: "https://withnen.com/blog/scaling-nen" },
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight mt-14 mb-4 text-foreground">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-muted-foreground leading-relaxed mb-4">{children}</p>;
}
function Pre({ children }: { children: string }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed text-foreground font-mono">
      {children}
    </pre>
  );
}

export default function ScalingNenPost() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 pt-20 pb-16">
          <div className="mb-10">
            <Link href="/blog" className="text-sm text-primary hover:underline">← Blog</Link>
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mt-6 mb-3">
              Engineering · June 18, 2026
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              Scaling Nen: one box to a global fleet
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The question we get most: <em>&quot;I don&apos;t run one server — I run a fleet
              behind a gateway. Does this even work?&quot;</em> Short answer: <strong>yes, with
              zero new code.</strong> It&apos;s the same stateless-app-tier + shared-store design
              you already run for every other stateful thing in your stack.
            </p>
          </div>

          <H2>The one-sentence mental model</H2>
          <P>
            A Nen session is between the browser and a <em>logical backend</em> — a keypair plus a
            shared session store — <strong>not a specific server process</strong>. Once that lands,
            everything else falls out: scale the backend any way you like, and as long as every
            instance that handles a request can reach the <strong>same session store</strong>, any
            instance can serve any request in any session.
          </P>

          <H2>Where the keys live</H2>
          <P>
            The hybrid X25519 + ML-KEM handshake runs <strong>once</strong>, and both sides{" "}
            <em>derive</em> the encryption key (ChaCha20) and the auth key (HMAC) locally — under
            NEN-PROTOCOL-V3 nothing secret is transmitted. The server stores{" "}
            <code className="text-foreground">{`{ encKey, macKey, usedNonces }`}</code> under a{" "}
            <code className="text-foreground">sid</code> in a pluggable{" "}
            <code className="text-foreground">SessionStore</code>. Every later request carries{" "}
            <code className="text-foreground">X-Nen-Session: &lt;sid&gt;</code> plus an HMAC
            signature; the server looks the session up by <code className="text-foreground">sid</code>,
            verifies, and decrypts. <strong>The store is the entire scaling story.</strong>
          </P>
          <Pre>{`InMemorySessionStore   → single instance only (dev). Pod A's session
                         is invisible to pod B → ISO-2002 on reroute.
RedisSessionStore      → any number of Node/serverless instances,
                         one shared Redis. Any pod sees any session.
UpstashSessionStore    → same, over REST — works in Edge runtimes
                         (Cloudflare Workers, Vercel Edge).`}</Pre>
          <P>
            Point every instance at a shared Redis/Upstash store and the app tier stays{" "}
            <strong>stateless</strong>: <strong>no sticky sessions</strong>, an instance can be
            killed mid-session, and the next request lands on another instance and just works.
          </P>
          <Pre>{`                       ┌────────── pod 1 ─┐
  Browser ─▶ CDN ─▶ LB ─┼────────── pod 2 ─┤──▶ Redis (shared sessions + nonces)
                       └────────── pod …12┘`}</Pre>

          <H2>Gateways, CDNs, and proxies in front</H2>
          <P>
            Nen ciphertext is opaque bytes, so caching layers and proxies pass it through fine.
            Three rules keep a gateway from breaking a session:
          </P>
          <P>
            <strong>1. Don&apos;t rewrite the path.</strong> The per-request HMAC signs a canonical
            string that includes the <em>pathname</em>. If the gateway rewrites{" "}
            <code className="text-foreground">/api/x</code> to{" "}
            <code className="text-foreground">/x</code>, the signature won&apos;t verify
            (<code className="text-foreground">ISO-3002</code>).{" "}
            <strong>2. Pass the <code className="text-foreground">X-Nen-*</code> headers through</strong>{" "}
            (session, nonce, timestamp, signature) — don&apos;t strip them.{" "}
            <strong>3. Don&apos;t transform the body.</strong> Any recompression or re-encoding of
            the ciphertext fails the AEAD tag (<code className="text-foreground">ISO-4001</code>) —
            which is exactly the integrity guarantee working as designed.
          </P>

          <H2>Multiple backends</H2>
          <P>
            A client handshakes <em>per origin</em>. If you split a monolith into services on
            different origins, each service that terminates a Nen session runs the handshake route
            and shares a store (its own, or a common one). Within one logical backend, all the
            replicas share <strong>one</strong> store — that&apos;s the fleet case above.
          </P>

          <H2>Where multi-recipient fits (and where it doesn&apos;t)</H2>
          <P>
            One subtlety worth naming: <strong>N load-balanced replicas of your service are still
            one recipient</strong> — they share a single identity and key material. That scales
            horizontally with the shared store, today, no new code.
          </P>
          <P>
            What&apos;s <em>different</em> is serving content to <strong>N independent
            organizations that each hold their own key</strong> — that&apos;s a multi-recipient
            envelope, a separate design we&apos;ve deliberately{" "}
            <Link href="/roadmap" className="text-primary hover:underline">deferred</Link> until a
            design partner needs it (it requires a key directory). Don&apos;t conflate the two: a
            big fleet is easy; many distinct key-holders is the harder, later problem.
          </P>

          <H2>Bottom line</H2>
          <P>
            A 1:1 Nen deployment scales like any stateless web service. The session store is the
            only shared state, and it&apos;s the same choice you already made for sessions, JWTs
            with a shared key, or any server-side state. No sticky sessions, no special routing —
            point the fleet at one store and grow.
          </P>

          <div className="mt-12 pt-8 border-t border-border/40">
            <P>
              Read the{" "}
              <Link href="/docs/protocol" className="text-primary hover:underline">protocol spec</Link>{" "}
              for the wire detail, or the{" "}
              <Link href="/docs/architecture" className="text-primary hover:underline">architecture</Link>{" "}
              guide for the session-store internals.
            </P>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
