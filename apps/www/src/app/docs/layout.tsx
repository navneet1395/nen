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
    <div className="flex flex-col min-h-screen relative">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background shadow-sm shadow-black/5">
        <div className="container mx-auto max-w-6xl px-4 flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-95 transition-opacity"
          >
            <Image
              src="/Logo.svg"
              alt="Isogeny Logo"
              width={24}
              height={24}
              className="h-6 w-auto"
            />
            <span className="text-foreground">Isogeny</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/docs"
              className="text-foreground transition-colors hover:text-primary"
            >
              Documentation
            </Link>
            <Link
              href="https://github.com/your-org/isogeny"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              GitHub
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="flex-1 container max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-8 py-10">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 pr-0 md:pr-6">
          <DocsSidebar />
        </aside>

        {/* Content */}
        <main className="flex-1 prose dark:prose-invert prose-zinc max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800/80 prose-code:text-primary dark:prose-code:text-blue-300 prose-headings:scroll-mt-20">
          <div className="p-2 md:p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
