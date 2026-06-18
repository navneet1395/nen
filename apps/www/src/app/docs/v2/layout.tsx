import Link from "next/link";

// Wraps every /docs/v2/* page (nested inside the main docs layout, so it still
// gets the sidebar + prose styling). Adds an "older version" banner.
export default function V2DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="not-prose mb-8 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
        <span aria-hidden className="text-amber-500">⚠</span>
        <span>
          You&apos;re viewing the <strong>v2</strong> docs (NEN-PROTOCOL-V2,{" "}
          <code className="text-foreground">@withnen/*@0.3.x</code>). The latest release is v3 —{" "}
          <Link href="/docs" className="font-medium text-primary hover:underline">
            switch to the latest docs →
          </Link>
        </span>
      </div>
      {children}
    </>
  );
}
