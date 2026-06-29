import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { FeedbackMetrics } from "@/components/feedback-metrics";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism nav bar */}
      <div className="mx-4 mt-4 rounded-2xl glass-strong border border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight group"
          >
            <div className="relative">
              <Image
                src="/Logo.svg"
                alt="Nen Logo"
                width={28}
                height={28}
                className="h-7 w-auto relative z-10"
              />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
            </div>
            <span className="gradient-text">Nen</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
            {[
              { href: "/performance", label: "Performance", hidden: "hidden md:inline" },
              { href: "/why-not-cloudflare", label: "Why not Cloudflare?", hidden: "hidden lg:inline" },
              { href: "/ai", label: "Secure AI", hidden: "hidden md:inline" },
              { href: "/faq", label: "FAQ", hidden: "hidden md:inline" },
              { href: "/blog", label: "Blog", hidden: "hidden xl:inline" },
              { href: "/roadmap", label: "Roadmap", hidden: "hidden xl:inline" },
              { href: "/pricing", label: "Pricing", hidden: "hidden sm:inline" },
              { href: "/docs", label: "Docs", hidden: "hidden sm:inline" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${item.hidden} px-3 py-1.5 rounded-lg transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-muted/50`}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/navneet1395/nen"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline px-3 py-1.5 rounded-lg transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-muted/50"
            >
              GitHub
            </a>
            <Link
              href="/docs/quickstart"
              className={`hidden sm:inline-flex ${buttonVariants({
                variant: "default",
                size: "sm",
              })} glow-blue-sm hover:glow-blue transition-all duration-300`}
            >
              Get Started
            </Link>
            <ThemeToggle />
            <MobileNav />
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full relative mt-20">
      {/* Top glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-candy-blue/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="relative">
                <Image
                  src="/Logo.svg"
                  alt="Nen Logo"
                  width={22}
                  height={22}
                  className="h-5.5 w-auto relative z-10"
                />
                <div className="absolute inset-0 bg-primary/15 blur-md rounded-full" />
              </div>
              <span className="font-semibold text-foreground gradient-text">
                Nen
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              End-to-end encrypted APIs for modern web apps. Powered by
              post-quantum cryptography.
            </p>
            <FeedbackMetrics />
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-semibold text-sm text-foreground/90 mb-1">
              Product
            </span>
            {[
              { href: "/performance", label: "Performance" },
              { href: "/why-not-cloudflare", label: "Why not Cloudflare?" },
              { href: "/ai", label: "Secure AI" },
              { href: "/faq", label: "FAQ" },
              { href: "/pricing", label: "Pricing" },
              { href: "/roadmap", label: "Roadmap" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground/80 hover:text-primary transition-colors duration-300"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-semibold text-sm text-foreground/90 mb-1">
              Developers
            </span>
            {[
              { href: "/docs", label: "Documentation" },
              { href: "/docs/quickstart", label: "Quickstart" },
              { href: "/docs/changelog", label: "Changelog" },
              { href: "/docs/error-codes", label: "Error codes" },
              { href: "/blog", label: "Blog" },
              {
                href: "https://github.com/navneet1395/nen",
                label: "GitHub",
                external: true,
              },
              {
                href: "https://www.npmjs.com/org/withnen",
                label: "npm",
                external: true,
              },
            ].map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground/80 hover:text-primary transition-colors duration-300"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground/80 hover:text-primary transition-colors duration-300"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-semibold text-sm text-foreground/90 mb-1">
              Security &amp; Compliance
            </span>
            {[
              { href: "/docs/protocol", label: "Protocol spec" },
              { href: "/docs/threat-model", label: "Threat model" },
              { href: "/docs/audit-readiness", label: "Audit readiness" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground/80 hover:text-primary transition-colors duration-300"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © 2026 Nen. We encrypt the payload, not the channel — TLS already
            does that.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
