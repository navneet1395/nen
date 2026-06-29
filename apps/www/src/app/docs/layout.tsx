import Link from "next/link";
import Image from "next/image";
import { DocsSidebar } from "@/components/docs-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen relative bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full">
        <div className="mx-4 mt-4 rounded-2xl glass-strong border border-border">
          <div className="container mx-auto max-w-6xl px-4 flex h-14 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-95 transition-opacity group"
            >
              <div className="relative">
                <Image
                  src="/Logo.svg"
                  alt="Nen Logo"
                  width={24}
                  height={24}
                  className="h-6 w-auto relative z-10"
                />
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
              </div>
              <span className="gradient-text">Nen</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="/docs"
                className="text-foreground/70 transition-colors hover:text-primary"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/navneet1395/nen"
                className="text-muted-foreground/80 transition-colors hover:text-primary"
              >
                GitHub
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-8 py-10">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 pr-0 md:pr-6">
          <DocsSidebar />
        </aside>

        {/* Content */}
        <main className="flex-1 prose prose-zinc dark:prose-invert max-w-none prose-pre:bg-[var(--code-bg)] prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:scroll-mt-20 prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground/80">
          <div className="p-2 md:p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
