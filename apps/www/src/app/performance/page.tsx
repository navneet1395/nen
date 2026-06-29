import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { BenchmarksDashboard } from "@/components/benchmarks-dashboard";
import { buttonVariants } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  FlaskConical,
  GitBranch,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Performance & Benchmarks | Nen",
  description:
    "Real, reproducible benchmark results for Nen's post-quantum encryption SDK. 867 req/s peak throughput, 3.2 ms ML-KEM-768 handshake, 0.014 ms per-request crypto overhead. Measured on a single instance with the public SDK.",
  keywords: [
    "post-quantum encryption performance",
    "ML-KEM-768 benchmark",
    "end-to-end encrypted API speed",
    "ChaCha20-Poly1305 throughput",
    "Nen benchmark",
    "payload encryption overhead",
  ],
  openGraph: {
    title: "Nen — Performance & Benchmarks",
    description:
      "867 req/s peak • 3.2 ms ML-KEM handshake • 0.014 ms crypto overhead per request. Full methodology and raw data included.",
    type: "website",
  },
};

const principles = [
  {
    icon: FlaskConical,
    title: "Real SDK, real routes",
    body: "Every number comes from driving the public API — handshake() → nenFetch() — against actual Next.js App Router endpoints. No mocked crypto, no in-process shortcuts.",
  },
  {
    icon: GitBranch,
    title: "Fully reproducible",
    body: "The entire harness lives in /bench. One command, one environment variable. Run it yourself against a production build for numbers that reflect your infra.",
  },
  {
    icon: ShieldCheck,
    title: "Security correctness first",
    body: "The regression suite asserts tampered-HMAC → 401, nonce replay → 409, and terminated-session rejection before a single throughput number is recorded.",
  },
  {
    icon: Zap,
    title: "Honest scope",
    body: "Measured on a dev-server, single instance, macOS. Production (next build + shared Redis) will differ. The disclaimer is in every result file.",
  },
];

const findings = [
  {
    label: "Peak throughput",
    value: "867 req/s",
    ctx: "at concurrency 50, 0 % errors",
    color: "text-primary",
  },
  {
    label: "Saturation point",
    value: "C = 50",
    ctx: "throughput drops beyond 50 concurrent clients on a single dev-server instance",
    color: "text-primary/70",
  },
  {
    label: "p99 latency at peak",
    value: "64 ms",
    ctx: "well within interactive budget even at peak load",
    color: "text-emerald-400",
  },
  {
    label: "ML-KEM-768 handshake",
    value: "3.2 ms",
    ctx: "one-time cost per session; amortised across all requests that follow",
    color: "text-amber-400",
  },
  {
    label: "Crypto overhead",
    value: "0.014 ms",
    ctx: "median time for ChaCha20-Poly1305 encrypt + decrypt in Wasm — effectively invisible",
    color: "text-rose-400",
  },
  {
    label: "Wire size inflation",
    value: "~1.34×",
    ctx: "base64 framing overhead; stabilises at ~33 % over 10 KB payloads",
    color: "text-cyan-400",
  },
];

export default function PerformancePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 w-full">
        {/* ─── Hero ─── */}
        <section className="w-full py-20 md:py-28 px-4 relative overflow-hidden">
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold bg-primary/5 text-primary mb-6 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Measured — not estimated
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Post-quantum encryption
              <br className="hidden md:block" />
              <span className="gradient-text"> that doesn&apos;t slow you down</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
              Every number on this page was produced by running the public Nen
              SDK against real Next.js API routes, then saving the raw JSON.
              The harness is open — reproduce it in five minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="#benchmarks"
                className={buttonVariants({ variant: "default", size: "lg" })}
              >
                See the numbers <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="https://github.com/withnen/nen"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Run it yourself
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Key findings grid ─── */}
        <section className="w-full py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-center">
              Key findings
            </h2>
            <p className="text-muted-foreground/80 text-center mb-10 max-w-2xl mx-auto">
              The headline numbers from the latest run — regression suite first,
              throughput second.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {findings.map((f) => (
                <div
                  key={f.label}
                  className="p-5 glass rounded-2xl"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    {f.label}
                  </p>
                  <p className={`text-3xl font-extrabold tabular-nums mb-1 ${f.color}`}>
                    {f.value}
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    {f.ctx}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Methodology ─── */}
        <section className="w-full py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-center">
              Methodology
            </h2>
            <p className="text-muted-foreground/80 text-center mb-10 max-w-2xl mx-auto">
              Four principles that make these numbers worth trusting.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {principles.map((p) => (
                <div
                  key={p.title}
                  className="flex gap-4 p-6 glass rounded-2xl"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary mt-0.5">
                    <p.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Weaknesses & follow-ups ─── */}
        <section className="w-full py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Weaknesses surfaced
            </h2>
            <p className="text-muted-foreground/80 mb-8 max-w-2xl">
              The bench harness is also a code health tool. It deliberately
              probes edge cases and documents what it finds — including things
              that need fixing.
            </p>
            <div className="space-y-4">
              {[
                {
                  tag: "SDK limitation",
                  color: "bg-amber-500/10 dark:bg-amber-400/10 dark:bg-amber-400/10 text-amber-400 border-amber-500/20 dark:border-amber-400/20",
                  title: "Encrypted GET requests are impossible",
                  body: "withNen() requires an encrypted {ct, n} body on every request, but the Fetch standard forbids a body on GET. Consequence: all reads must use POST or PUT. Documented in the regression suite so any future change is caught automatically.",
                },
                {
                  tag: "Observation",
                  color: "bg-primary/10 text-primary border-primary/20",
                  title: "HMAC covers pathname, not query string",
                  body: "The canonical HMAC string uses URL.pathname — query parameters are not signed. Dynamic resource IDs must travel in the path (e.g. /api/notes/:id), not as ?id=. Adding them to the query drops them outside the integrity guarantee.",
                },
                {
                  tag: "Scaling",
                  color: "bg-violet-500/10 dark:bg-violet-400/10 text-violet-400 border-violet-500/20 dark:border-violet-400/20",
                  title: "p99 latency spikes above C = 50 on a single instance",
                  body: "p99 jumps from 64 ms at C=50 to 1067 ms at C=100 on the dev server. This is Node.js single-threaded event-loop saturation, not a crypto bottleneck — a production build behind a load-balancer distributes the handshake cost across multiple instances.",
                },
                {
                  tag: "Memory",
                  color: "bg-rose-500/10 dark:bg-rose-400/10 text-rose-400 border-rose-500/20 dark:border-rose-400/20",
                  title: "Server RSS grows ~130 MB per 1 000-request load level",
                  body: "RSS grew from ~1 168 MB baseline to ~2 950 MB at C=200 (a 1 000-request run each). The in-memory session store retains nonce-replay tracking sets; configure a TTL or switch to Redis in production to bound memory under sustained load.",
                },
              ].map((w) => (
                <div
                  key={w.title}
                  className="p-5 glass rounded-2xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${w.color}`}>
                      {w.tag}
                    </span>
                    <h3 className="font-semibold text-foreground">
                      {w.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed">
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Full interactive dashboard ─── */}
        <div id="benchmarks">
          <BenchmarksDashboard />
        </div>

        {/* ─── Reproduce CTA ─── */}
        <section className="w-full py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Don&apos;t trust our numbers — run your own
            </h2>
            <p className="text-muted-foreground/80 leading-relaxed mb-8">
              The full harness is in{" "}
              <code className="text-sm font-mono bg-muted/50 px-1.5 py-0.5 rounded text-primary/80">
                /bench
              </code>{" "}
              in the repo. Start the demo server, point{" "}
              <code className="text-sm font-mono bg-muted/50 px-1.5 py-0.5 rounded text-primary/80">
                TARGET_URL
              </code>{" "}
              at it, and run{" "}
              <code className="text-sm font-mono bg-muted/50 px-1.5 py-0.5 rounded text-primary/80">
                node bench/run-all.js
              </code>
              . Results land in{" "}
              <code className="text-sm font-mono bg-muted/50 px-1.5 py-0.5 rounded text-primary/80">
                bench/results/latest/
              </code>
              .
            </p>
            <div className="glass rounded-xl text-sm font-mono p-5 text-left inline-block max-w-lg w-full">
              <span className="text-muted-foreground/60"># start the demo server</span>
              <br />
              <span className="text-primary">cd</span> apps/www{" "}
              <span className="text-muted-foreground/60">&amp;&amp;</span> npx next build{" "}
              <span className="text-muted-foreground/60">&amp;&amp;</span> npx next start
              -p 3005
              <br />
              <br />
              <span className="text-muted-foreground/60"># run the full suite</span>
              <br />
              TARGET_URL=http://localhost:3005 node bench/run-all.js
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/docs/quickstart"
                className={buttonVariants({ variant: "default", size: "lg" })}
              >
                Get started <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="/why-not-cloudflare"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Why not just use Cloudflare?
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
