"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Compass, BookOpen, Cpu, ShieldAlert, FileText, CornerDownRight, Rocket, ScrollText, ShieldCheck, ClipboardCheck, Bug } from "lucide-react";

interface SidebarItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

interface SidebarGroup {
  category: string;
  items: SidebarItem[];
}

interface SearchIndexItem {
  title: string;
  href: string;
  type: "page" | "heading";
  page?: string;
  content: string;
}

const DOCS_INDEX: SearchIndexItem[] = [
  // Page: Introduction
  { title: "Introduction", href: "/docs", type: "page", content: "Introduction to Nen: Next-generation cryptographic tool for seamless PQC integration." },
  { title: "Why Nen? (TLS + Nen)", href: "/docs#why-nen", type: "heading", page: "Introduction", content: "TLS encrypts the channel; Nen encrypts the payload that survives TLS termination — logs, DBs, proxies." },
  { title: "Why Nen?", href: "/docs#why-nen", type: "heading", page: "Introduction", content: "Protects application layer, prevents store-now-decrypt-later attacks." },
  { title: "Architecture at a Glance", href: "/docs#architecture-at-a-glance", type: "heading", page: "Introduction", content: "Overview of client, server, and WebAssembly components." },

  // Page: Quickstart
  { title: "Quickstart", href: "/docs/quickstart", type: "page", content: "Zero to an encrypted API call in ten lines. npx create-nen-app, mount session routes, protect an endpoint, call nenFetch. TLS plus Nen." },

  // Page: Installation
  { title: "Installation", href: "/docs/installation", type: "page", content: "Get started with installing Nen packages." },
  { title: "Using the CLI (Recommended)", href: "/docs/installation#using-the-cli-recommended", type: "heading", page: "Installation", content: "npx create-nen-app command creates boilerplate with configuration." },
  { title: "Manual Installation", href: "/docs/installation#manual-installation", type: "heading", page: "Installation", content: "Manual setup for nen-server and nen-client packages." },
  { title: "Prerequisites", href: "/docs/installation#prerequisites", type: "heading", page: "Installation", content: "NodeJS runtime, NextJS or Express backend requirements." },

  // Page: Usage
  { title: "Usage Guide", href: "/docs/usage", type: "page", content: "How to use Nen in your full-stack applications." },
  { title: "Setting up the Server Handshake Route", href: "/docs/usage#1-setting-up-the-server-handshake-route", type: "heading", page: "Usage Guide", content: "Next.js Route Handlers setup with withNen middleware." },
  { title: "Using the Client Engine", href: "/docs/usage#2-using-the-client-engine", type: "heading", page: "Usage Guide", content: "Creating an NenClient instance and sending requests." },
  { title: "Protecting Server Endpoints", href: "/docs/usage#3-protecting-server-endpoints", type: "heading", page: "Usage Guide", content: "Verifying secure payloads using middleware signature checks." },

  // Page: Architecture Detail
  { title: "Under the Hood", href: "/docs/architecture", type: "page", content: "Deep dive into Nen architecture." },
  { title: "The WebAssembly Core (core-crypto)", href: "/docs/architecture#the-webassembly-core-core-crypto", type: "heading", page: "Under the Hood", content: "Rust-compiled Wasm core running ML-KEM and ML-DSA natively." },
  { title: "The Handshake Protocol", href: "/docs/architecture#the-handshake-protocol", type: "heading", page: "Under the Hood", content: "Four-step cryptographic handshake establishing session keys." },
  { title: "Data Transport", href: "/docs/architecture#data-transport", type: "heading", page: "Under the Hood", content: "How ciphertext payloads are structured and decrypted." },

  // Page: Cryptography Specs
  { title: "Cryptography Specifications", href: "/docs/crypto", type: "page", content: "FIPS 203, FIPS 204, session keys, ChaCha20Poly1305 and HMAC details." },
  { title: "Key Encapsulation: ML-KEM (Kyber)", href: "/docs/crypto#key-encapsulation-ml-kem-kyber", type: "heading", page: "Cryptography Specs", content: "Parameter sets ML-KEM-512, ML-KEM-768, ML-KEM-1024." },
  { title: "Digital Signatures: ML-DSA (Dilithium)", href: "/docs/crypto#digital-signatures-ml-dsa-dilithium", type: "heading", page: "Cryptography Specs", content: "ML-DSA-65 and ML-DSA-87 identity authentication." },
  { title: "Session keys (HKDF key schedule)", href: "/docs/crypto#session-keys-hkdf-key-schedule", type: "heading", page: "Cryptography Specs", content: "NEN-PROTOCOL-V3 HKDF-SHA256 key schedule: k_enc and k_mac derived locally on each side from the hybrid shared secret. No key material on the wire. Rekey ratchet." },
  { title: "Symmetric Encryption: ChaCha20Poly1305", href: "/docs/crypto#symmetric-encryption-chacha20poly1305", type: "heading", page: "Cryptography Specs", content: "High-performance authenticated encryption with associated data." },
  { title: "Request Authentication: HMAC-SHA256", href: "/docs/crypto#request-authentication-hmac-sha256", type: "heading", page: "Cryptography Specs", content: "Message authentication code preventing request tampering." },

  // Page: Protocol
  { title: "Protocol — NEN-PROTOCOL-V3", href: "/docs/protocol", type: "page", content: "The exact wire format: hybrid X25519 + ML-KEM-768 handshake, HKDF key schedule with no key material on the wire, base64 payloads, HMAC canonical string, replay window, resumption, rekey ratchet, transcript-bound identity." },

  // Page: Changelog
  { title: "Changelog", href: "/docs/changelog", type: "page", content: "Release history: NEN-PROTOCOL-V3 (v0.4.0) hybrid HKDF key schedule, V2 bidirectional per-request nonce, package versions, wire-breaking changes." },

  // Page: Threat model
  { title: "Threat model", href: "/docs/threat-model", type: "page", content: "What Nen protects and does not protect. Trust boundary between endpoints. TLS plus Nen, not versus." },

  // Page: Audit readiness
  { title: "Audit readiness", href: "/docs/audit-readiness", type: "page", content: "Test coverage, negative-path matrix, published artifacts, and external review roadmap for auditors and buyers." },

  // Page: API Reference
  { title: "API Reference", href: "/docs/api", type: "page", content: "Every export from @withnen/client and @withnen/server: NenClient, nenFetch, nenStream, withNen, withNenStream, session stores, NenError, describeNenCode." },

  // Page: Error codes
  { title: "Error codes (ISO-xxxx)", href: "/docs/error-codes", type: "page", content: "Every Nen failure carries a stable ISO-xxxx code with HTTP status, cause, and fix. Deep-linkable per code." }
];

// Pages that are a single stable contract across protocol versions — they keep
// their canonical /docs/* URL and are never prefixed with a version segment.
const VERSION_INDEPENDENT = new Set(["/docs/error-codes", "/docs/changelog"]);

export function DocsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ── Docs versioning ────────────────────────────────────────────────────────
  const isV2 = pathname.startsWith("/docs/v2");
  const currentVersion = isV2 ? "v2" : "latest";
  // The equivalent "latest" path for whatever page we're on.
  const latestPath = isV2 ? pathname.replace("/docs/v2", "/docs") || "/docs" : pathname;

  // Rewrite a canonical /docs href into the current version's namespace.
  function withVersion(href: string): string {
    if (!isV2 || VERSION_INDEPENDENT.has(href)) return href;
    if (href === "/docs") return "/docs/v2";
    if (href.startsWith("/docs/")) return href.replace("/docs/", "/docs/v2/");
    return href;
  }

  function switchVersion(v: string) {
    if (v === "latest") return router.push(latestPath);
    // → v2: version-independent pages have no v2 twin, so land on the v2 home.
    if (VERSION_INDEPENDENT.has(latestPath)) return router.push("/docs/v2");
    const suffix = latestPath === "/docs" ? "" : latestPath.slice("/docs".length);
    return router.push(`/docs/v2${suffix}`);
  }

  const groups: SidebarGroup[] = useMemo(() => [
    {
      category: "Getting Started",
      items: [
        { title: "Introduction", href: "/docs", icon: <BookOpen className="w-4 h-4" /> },
        { title: "Quickstart", href: "/docs/quickstart", icon: <Rocket className="w-4 h-4" /> },
        { title: "Installation", href: "/docs/installation", icon: <Compass className="w-4 h-4" /> },
        { title: "Usage", href: "/docs/usage", icon: <Cpu className="w-4 h-4" /> },
      ],
    },
    {
      category: "Architecture",
      items: [
        { title: "Under the Hood", href: "/docs/architecture", icon: <Cpu className="w-4 h-4" /> },
        { title: "Cryptography Specs", href: "/docs/crypto", icon: <ShieldAlert className="w-4 h-4" /> },
      ],
    },
    {
      category: "Security & Compliance",
      items: [
        { title: "Protocol Spec", href: "/docs/protocol", icon: <ScrollText className="w-4 h-4" /> },
        { title: "Threat Model", href: "/docs/threat-model", icon: <ShieldCheck className="w-4 h-4" /> },
        { title: "Audit Readiness", href: "/docs/audit-readiness", icon: <ClipboardCheck className="w-4 h-4" /> },
      ],
    },
    {
      category: "Reference",
      items: [
        { title: "API Reference", href: "/docs/api", icon: <FileText className="w-4 h-4" /> },
        { title: "Error Codes", href: "/docs/error-codes", icon: <Bug className="w-4 h-4" /> },
        { title: "Changelog", href: "/docs/changelog", icon: <ScrollText className="w-4 h-4" /> },
      ],
    },
  ], []);

  // Filter content matching search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return DOCS_INDEX.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.page && item.page.toLowerCase().includes(query))
    ).slice(0, 5); // Limit to 5 results
  }, [searchQuery]);

  // Global event listener for Cmd+K and closing menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K focus
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowResults(true);
      }

      // Close on Escape
      if (e.key === "Escape") {
        setShowResults(false);
        searchInputRef.current?.blur();
      }

      // Navigation within results
      if (showResults && searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % searchResults.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const target = searchResults[activeIndex];
          if (target) {
            router.push(target.href);
            setShowResults(false);
            setSearchQuery("");
          }
        }
      }
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showResults, searchResults, activeIndex, router]);

  // Keep active index bounded when results change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [searchResults]);

  return (
    <div className="sticky top-24 flex flex-col gap-6">
      {/* Version switcher */}
      <div className="flex items-center gap-2">
        <label htmlFor="docs-version" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Version
        </label>
        <select
          id="docs-version"
          value={currentVersion}
          onChange={(e) => switchVersion(e.target.value)}
          className="flex-1 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        >
          <option value="latest">v3 (latest)</option>
          <option value="v2">v2</option>
        </select>
      </div>

      {/* Search Input Box */}
      <div ref={searchContainerRef} className="relative group z-30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search docs... (⌘K)"
            value={searchQuery}
            onFocus={() => setShowResults(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            className="w-full pl-9 pr-12 py-2 text-sm rounded-xl border border-border/60 bg-background/40 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/70 text-foreground"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted/60 px-1.5 font-mono text-[9px] font-medium text-muted-foreground/80">
            <span>⌘</span>K
          </kbd>
        </div>

        {/* Live Search Results Overlay Dropdown */}
        {showResults && searchQuery.trim() !== "" && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-border/60 rounded-xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto z-40 animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="p-2 border-b bg-muted/30 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Search Results
            </div>
            
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No docs match &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="p-1.5 space-y-1">
                {searchResults.map((result, idx) => {
                  const isHovered = idx === activeIndex;
                  return (
                    <Link
                      key={result.href}
                      href={result.href}
                      onClick={() => {
                        setShowResults(false);
                        setSearchQuery("");
                      }}
                      className={`block p-2.5 rounded-lg text-left transition-colors border ${
                        isHovered
                          ? "bg-primary/10 border-primary/20 text-foreground"
                          : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        {result.type === "page" ? (
                          <FileText className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{result.title}</span>
                        {result.page && (
                          <span className="text-[10px] font-normal text-muted-foreground/80 bg-muted/80 px-1.5 py-0.5 rounded ml-auto">
                            {result.page}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/85 mt-1 truncate">
                        {result.content}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Navigation Links */}
      <nav className="space-y-6">
        {groups.map((group) => (
          <div key={group.category} className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider pl-2">
              {group.category}
            </h4>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const href = withVersion(item.href);
                const isActive = pathname === href;
                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-200 relative group/link ${
                        isActive
                          ? "font-medium text-foreground bg-primary/10 shadow-sm border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-md" />
                      )}
                      <span className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground/70 group-hover/link:text-foreground"}`}>
                        {item.icon}
                      </span>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
