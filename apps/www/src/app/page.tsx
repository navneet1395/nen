"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Navbar */}
      <header className="absolute top-0 w-full z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto left-0 right-0">
        <div className="text-2xl font-bold tracking-tighter">Isogeny.</div>
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <Link href="/docs" className="hover:text-accent transition-colors">Documentation</Link>
          <Link href="/docs/installation" className="hover:text-accent transition-colors">Installation</Link>
          <a href="https://github.com/navneetgupta/isogeny" className="hover:text-accent transition-colors">GitHub</a>
        </nav>
        <div className="flex gap-4">
          <Link href="/docs" className="bg-foreground text-background px-5 py-2 rounded-full text-sm font-medium hover:bg-accent hover:text-white transition-all shadow-sm">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-4 relative z-10">
        
        {/* Subtle background glow effect (White mode) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20"
          >
            <ShieldCheck size={16} />
            <span>Post-Quantum Ready. FIPS-203 Compliant.</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-extrabold tracking-tight text-balance leading-[1.1]"
          >
            Next-Gen Security <br className="hidden md:block" /> for Serverless.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed"
          >
            Drop-in End-to-End Encryption for Next.js. Powered by WebAssembly, Kyber-768, and ChaCha20-Poly1305.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/docs" className="group flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-lg font-medium hover:bg-accent hover:text-white transition-all w-full sm:w-auto shadow-md">
              Read the Docs
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-2 bg-white border border-border px-8 py-4 rounded-full text-lg font-mono text-muted-foreground w-full sm:w-auto shadow-sm">
              <span className="text-foreground/50">$</span> npm i @isogeny/client
            </div>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-32 w-full px-4">
          <FeatureCard 
            icon={<ShieldCheck className="text-accent" size={24} />}
            title="Kyber-768 Handshakes"
            desc="Military-grade post-quantum key encapsulation mechanism directly in the browser via WebAssembly."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Lock className="text-accent" size={24} />}
            title="Perfect Forward Secrecy"
            desc="Session-based symmetric keys that are rotated and destroyed instantly. Zero plaintext on the wire."
            delay={0.5}
          />
          <FeatureCard 
            icon={<Zap className="text-accent" size={24} />}
            title="Zero-Boilerplate DX"
            desc="Wrap your API routes in our Higher-Order Function. You write JSON, we handle the cryptography."
            delay={0.6}
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="glass-card p-8 rounded-3xl flex flex-col items-start gap-4 hover:shadow-lg transition-shadow bg-white"
    >
      <div className="p-3 bg-accent/10 rounded-2xl">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </motion.div>
  );
}
