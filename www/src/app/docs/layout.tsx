"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DOC_LINKS = [
  { name: "Introduction", href: "/docs" },
  { name: "Installation", href: "/docs/installation" },
  { name: "Usage", href: "/docs/usage" },
  { name: "Advanced APIs", href: "/docs/advanced" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-8 py-4 border-b border-border bg-white/80 backdrop-blur-md">
        <Link href="/" className="text-xl font-bold tracking-tighter hover:text-accent transition-colors">Isogeny.</Link>
        <div className="flex items-center gap-4">
          <a href="https://github.com/navneetgupta/isogeny" className="text-sm font-medium hover:text-accent transition-colors">GitHub</a>
        </div>
      </header>

      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border shrink-0 py-8 px-6 hidden md:block">
          <nav className="flex flex-col gap-2 sticky top-24">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Getting Started</h4>
            {DOC_LINKS.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-all duration-200",
                  pathname === link.href 
                    ? "bg-accent/10 text-accent font-medium" 
                    : "text-muted-foreground hover:bg-border/50 hover:text-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 py-10 px-8 md:px-12 max-w-4xl">
          <div className="prose prose-slate prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
