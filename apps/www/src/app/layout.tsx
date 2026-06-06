import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = "https://nen.dev";

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
  icons: {
    icon: "/Logo.svg",
    shortcut: "/Logo.svg",
    apple: "/Logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
