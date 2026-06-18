import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Blog | Nen — Post-Quantum Payload Encryption",
  description:
    "Engineering and security writing from the Nen team — how the protocol works, how it scales, and the honest trade-offs behind post-quantum payload encryption.",
  openGraph: {
    title: "Blog | Nen",
    description:
      "Engineering and security writing from the Nen team.",
    url: "https://withnen.com/blog",
  },
  alternates: { canonical: "https://withnen.com/blog" },
};

interface Post {
  slug: string;
  title: string;
  date: string;
  tag: string;
  excerpt: string;
}

const POSTS: Post[] = [
  {
    slug: "scaling-nen",
    title: "Scaling Nen: one box to a global fleet",
    date: "June 18, 2026",
    tag: "Engineering",
    excerpt:
      "Does payload encryption survive a load-balanced, gateway-fronted fleet? Yes — with zero new code. The session lives in a shared SessionStore, not a process, so the app tier stays stateless and needs no sticky sessions.",
  },
];

export default function BlogIndex() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-background">
        <section className="pt-20 pb-12 px-4 border-b border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-4">
              Blog
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              Engineering &amp; <span className="text-primary">security writing</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              How the protocol works, how it scales, and the honest trade-offs behind
              post-quantum payload encryption.
            </p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-border/60 bg-background/40 p-6 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
                  {post.tag} · {post.date}
                </p>
                <h2 className="text-xl font-bold text-foreground mb-2 leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
