"use client";

import { Shield, Lock, MonitorSmartphone, Server } from "lucide-react";

export function ArchitectureVisualizer() {
  return (
    <div className="w-full max-w-5xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Where Nen Fits</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          An application-layer post-quantum tunnel. We bypass compromised networks and edge nodes, delivering secure end-to-end encryption directly between user and server.
        </p>
      </div>

      <div className="relative w-full aspect-[21/9] min-h-[300px] flex items-center justify-center bg-background/50 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 z-0" />
        
        {/* Abstract Animated SVG Diagram */}
        <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gradient-tunnel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
            
            <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connection Lines */}
          <path d="M 250 200 C 400 200, 600 200, 750 200" fill="none" stroke="url(#path-gradient)" strokeWidth="3" strokeDasharray="6 6" className="animate-flow" />
          <path d="M 250 200 C 400 100, 600 100, 750 200" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="4 8" />
          <path d="M 250 200 C 400 300, 600 300, 750 200" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="4 8" />

          {/* Secure Tunnel Wrapper */}
          <path d="M 250 180 Q 500 180 750 180 L 750 220 Q 500 220 250 220 Z" fill="url(#gradient-tunnel)" filter="url(#glow)" className="opacity-70" />

          {/* Data Packets */}
          <circle cx="0" cy="0" r="4" fill="#60a5fa" filter="url(#glow)">
            <animateMotion dur="3s" repeatCount="indefinite" path="M 250 200 C 400 200, 600 200, 750 200" />
          </circle>
          <circle cx="0" cy="0" r="3" fill="#93c5fd" opacity="0.6">
            <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M 250 200 C 400 200, 600 200, 750 200" />
          </circle>
          <circle cx="0" cy="0" r="5" fill="#3b82f6" filter="url(#glow)">
            <animateMotion dur="3s" begin="2s" repeatCount="indefinite" path="M 250 200 C 400 200, 600 200, 750 200" />
          </circle>

          {/* Edge/Middleware Nodes representing traditional vulnerable points */}
          <circle cx="400" cy="100" r="8" fill="currentColor" opacity="0.2" />
          <circle cx="600" cy="100" r="8" fill="currentColor" opacity="0.2" />
          <circle cx="500" cy="300" r="8" fill="currentColor" opacity="0.2" />
          
          <text x="500" y="330" fill="currentColor" opacity="0.4" fontSize="12" textAnchor="middle" className="font-mono">Compromised Middleboxes / CDNs</text>
          <text x="500" y="80" fill="currentColor" opacity="0.4" fontSize="12" textAnchor="middle" className="font-mono">Legacy TLS Termination</text>
        </svg>

        {/* Client UI Element */}
        <div className="absolute left-[10%] md:left-[15%] z-20 flex flex-col items-center animate-float" style={{ animationDelay: '0s' }}>
          <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl shadow-blue-900/20 flex items-center justify-center relative group-hover:scale-105 transition-transform">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-xl" />
            <MonitorSmartphone className="w-8 h-8 text-blue-400" />
            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
              <Lock className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="font-bold text-sm">Client Edge</h3>
            <p className="text-[10px] text-muted-foreground">Wasm Encryption</p>
          </div>
        </div>

        {/* Secure Tunnel Label */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur border px-4 py-1.5 rounded-full shadow-sm">
          <span className="text-xs font-bold text-primary flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Nen Post-Quantum Tunnel
          </span>
        </div>

        {/* Server UI Element */}
        <div className="absolute right-[10%] md:right-[15%] z-20 flex flex-col items-center animate-float" style={{ animationDelay: '1s' }}>
          <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl shadow-primary/20 flex items-center justify-center relative group-hover:scale-105 transition-transform">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
            <Server className="w-8 h-8 text-primary" />
            <div className="absolute -bottom-2 -left-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
              <Shield className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="font-bold text-sm">Next.js API</h3>
            <p className="text-[10px] text-muted-foreground">Nen Middleware</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
         <div className="bg-background/40 backdrop-blur-sm border rounded-xl p-5 shadow-sm">
           <h4 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-2"><Lock className="w-4 h-4 text-primary"/> End-to-End</h4>
           <p className="text-xs text-muted-foreground">Encryption starts at the user's device and doesn't decrypt until it hits your runtime.</p>
         </div>
         <div className="bg-background/40 backdrop-blur-sm border rounded-xl p-5 shadow-sm">
           <h4 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary"/> Bypass Vulnerabilities</h4>
           <p className="text-xs text-muted-foreground">Proxies, CDNs, and load balancers only see ciphertext, rendering breaches harmless.</p>
         </div>
         <div className="bg-background/40 backdrop-blur-sm border rounded-xl p-5 shadow-sm">
           <h4 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-2"><Server className="w-4 h-4 text-primary"/> Native Integration</h4>
           <p className="text-xs text-muted-foreground">Plugs directly into Next.js Route Handlers or Express middleware with zero configuration.</p>
         </div>
      </div>
    </div>
  );
}
