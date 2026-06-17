import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NenFeedbackWidget } from "@/components/nen-feedback-widget";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = "https://withnen.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nen — Post-Quantum Payload Encryption for Modern APIs",
    template: "%s | Nen",
  },
  description:
    "End-to-end encrypted API payloads powered by ML-KEM-768 (FIPS 203). TLS encrypts the channel; Nen encrypts the payload that survives TLS termination — logs, DBs, CDN nodes, third-party hops. Drop-in SDK for Next.js.",
  keywords: [
    "post-quantum cryptography",
    "ML-KEM",
    "FIPS 203",
    "payload encryption",
    "end-to-end encryption",
    "API security",
    "Next.js encryption",
    "ChaCha20-Poly1305",
    "harvest now decrypt later",
    "quantum safe",
    "PQC SDK",
    "secure AI",
  ],
  authors: [{ name: "Nen" }],
  creator: "Nen",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Nen",
    title: "Nen — Post-Quantum Payload Encryption for Modern APIs",
    description:
      "TLS encrypts the channel; Nen encrypts the payload that survives TLS termination. ML-KEM-768 + ChaCha20-Poly1305, drop-in SDK for Next.js.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Nen — Post-Quantum Payload Encryption",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nen — Post-Quantum Payload Encryption for Modern APIs",
    description:
      "TLS encrypts the channel; Nen encrypts the payload that survives TLS termination. ML-KEM-768 + ChaCha20-Poly1305, drop-in SDK for Next.js.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  // Icons are provided by the file-system convention (app/favicon.ico,
  // app/icon.png, app/icon.svg, app/apple-icon.png) so browsers and bookmarks
  // get a real raster Nen mark instead of the SVG-only fallback.
};

// Structured data (JSON-LD) for search engines and AI answer engines (GEO).
// Describes Nen as an organization, the site, and the software product so
// crawlers and LLMs can resolve the entity, not just index prose.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Nen",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      description:
        "Nen provides application-layer, end-to-end payload encryption for APIs, powered by post-quantum cryptography (ML-KEM-768). It runs on top of TLS so payloads stay ciphertext past TLS termination.",
      email: "hello@withnen.com",
      sameAs: ["https://github.com/navneet1395/nen"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Nen",
      description:
        "End-to-end encrypted API payloads powered by ML-KEM-768 (FIPS 203). A drop-in SDK for Next.js.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Nen",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Node.js, Edge, browsers (any JavaScript runtime)",
      description:
        "Drop-in SDK that adds post-quantum, application-layer payload encryption to API requests and responses. TLS encrypts the channel; Nen encrypts the payload that survives TLS termination — logs, databases, CDN nodes, proxies, and third-party hops see only ciphertext. Uses ML-KEM-768 key exchange and ChaCha20-Poly1305.",
      url: SITE_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
      softwareHelp: `${SITE_URL}/docs`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <NenFeedbackWidget />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
