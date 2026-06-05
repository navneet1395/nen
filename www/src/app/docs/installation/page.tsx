export default function InstallationPage() {
  return (
    <>
      <h1>Installation</h1>
      <p className="lead">
        Get up and running with Isogeny in your Next.js project in minutes.
      </p>

      <h2>1. Install Packages</h2>
      <p>Isogeny is split into two packages: the React/Browser Client SDK and the Next.js Server Middleware.</p>
      
      <pre className="bg-foreground text-background p-4 rounded-xl">
        <code>npm install @isogeny/client @isogeny/server</code>
      </pre>

      <h2>2. Configure Next.js Webpack</h2>
      <p>
        Because Isogeny uses WebAssembly natively, you must enable `asyncWebAssembly` in your <code>next.config.ts</code> so that Next.js knows how to bundle the `.wasm` file properly.
      </p>
      
      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;`}</code>
      </pre>

      <h2>3. Set up the Handshake Route</h2>
      <p>
        The client needs an endpoint to negotiate the initial ML-KEM exchange. Expose this endpoint anywhere in your App Router API routes. We recommend <code>/api/isogeny/handshake</code>.
      </p>

      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`// src/app/api/isogeny/handshake/route.ts
import { handleHandshake } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleHandshake(request);
}`}</code>
      </pre>
      
      <p>You are now ready to start sending secure data!</p>
    </>
  );
}
