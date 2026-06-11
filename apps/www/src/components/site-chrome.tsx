import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { FeedbackMetrics } from "@/components/feedback-metrics";

export function SiteHeader() {
  return (
    <header className="px-6 py-4 border-b border-border/60 bg-background shadow-sm shadow-black/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Image src="/Logo.svg" alt="Nen Logo" width={24} height={24} className="h-6 w-auto" />
          <span>Nen</span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-5 text-sm font-medium">
          <Link href="/performance" className="hidden md:inline transition-colors hover:text-primary text-muted-foreground">
            Performance
          </Link>
          <Link href="/why-not-cloudflare" className="hidden md:inline transition-colors hover:text-primary text-muted-foreground">
            Why not Cloudflare?
          </Link>
          <Link href="/ai" className="hidden md:inline transition-colors hover:text-primary text-muted-foreground">
            Secure AI
          </Link>
          <Link href="/faq" className="hidden md:inline transition-colors hover:text-primary text-muted-foreground">
            FAQ
          </Link>
          <Link href="/pricing" className="hidden sm:inline transition-colors hover:text-primary text-muted-foreground">
            Pricing
          </Link>
          <Link href="/docs" className="hidden sm:inline transition-colors hover:text-primary text-muted-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/navneet1395/nen"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline transition-colors hover:text-primary text-muted-foreground"
          >
            GitHub
          </a>
          <Link href="/docs/quickstart" className={`hidden sm:inline-flex ${buttonVariants({ variant: "default", size: "sm" })}`}>
            Get Started
          </Link>
          <ThemeToggle />
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full border-t py-12 px-4">
      <div className="container max-w-6xl mx-auto flex flex-col gap-8 text-sm text-muted-foreground">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/Logo.svg" alt="Nen Logo" width={20} height={20} className="h-5 w-auto" />
              <span className="font-semibold text-foreground">Nen</span>
            </div>
            <p className="text-xs leading-relaxed">
              End-to-end encrypted APIs for modern web apps. Powered by post-quantum cryptography.
            </p>
            <FeedbackMetrics />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground">Product</span>
            <Link href="/performance" className="hover:text-primary">Performance</Link>
            <Link href="/why-not-cloudflare" className="hover:text-primary">Why not Cloudflare?</Link>
            <Link href="/ai" className="hover:text-primary">Secure AI</Link>
            <Link href="/faq" className="hover:text-primary">FAQ</Link>
            <Link href="/pricing" className="hover:text-primary">Pricing</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground">Developers</span>
            <Link href="/docs" className="hover:text-primary">Documentation</Link>
            <Link href="/docs/quickstart" className="hover:text-primary">Quickstart</Link>
            <Link href="/docs/error-codes" className="hover:text-primary">Error codes</Link>
            <a href="https://github.com/navneet1395/nen" target="_blank" rel="noopener noreferrer" className="hover:text-primary">GitHub</a>
            <a href="https://www.npmjs.com/org/withnen" target="_blank" rel="noopener noreferrer" className="hover:text-primary">npm</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-foreground">Security &amp; Compliance</span>
            <Link href="/docs/protocol" className="hover:text-primary">Protocol spec</Link>
            <Link href="/docs/threat-model" className="hover:text-primary">Threat model</Link>
            <Link href="/docs/audit-readiness" className="hover:text-primary">Audit readiness</Link>
          </div>
        </div>
        <p className="pt-4 border-t border-border/40">
          © 2026 Nen. We encrypt the payload, not the channel — TLS already does that.
        </p>
      </div>
    </footer>
  );
}
