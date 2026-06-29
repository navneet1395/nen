import Link from "next/link";

// Wraps every /docs/v2/* page (nested inside the main docs layout, so it still
// gets the sidebar + prose styling). Adds an "older version" banner.
export default function V2DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="not-prose mb-8 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-foreground/80">
        <span aria-hidden className="text-amber-400">⚠</span>
        <span>
          You&apos;re viewing the <strong>v2</strong> docs (NEN-PROTOCOL-V2,{" "}
          <code className="text-primary/80 bg-muted/50 px-1 py-0.5 rounded">@withnen/*@0.3.x</code>). The latest release is v3 —{" "}
          <Link href="/docs" className="font-medium text-primary hover:underline">
            switch to the latest docs →
          </Link>
        </span>
      </div>
      {children}
    </>
  );
}
