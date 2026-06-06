export default function UsagePage() {
  return (
    <>
      <h1>Usage</h1>
      <p className="lead">
        Securing your data with Isogeny is designed to feel just like using the standard <code>fetch</code> API.
      </p>

      <h2>1. The Client SDK</h2>
      <p>
        Initialize the client, perform the Post-Quantum Handshake, and then use <code>pqcfetch</code> instead of <code>fetch</code>. 
        All payloads will be automatically encrypted.
      </p>

      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`"use client";
import { IsogenyClient } from '@isogeny/client';

const client = new IsogenyClient('');

export default function SecureForm() {
  const submitData = async () => {
    // 1. Establish the Post-Quantum Shared Secret
    await client.handshake();

    // 2. Transmit data securely
    const response = await client.pqcfetch('/api/secure-data', {
      method: 'POST',
      body: JSON.stringify({ password: 'super_secret' })
    });

    console.log("Server responded securely:", response);
  };

  return <button onClick={submitData}>Send Secure Data</button>;
}`}</code>
      </pre>

      <h2>2. The DX Wrapper (Server)</h2>
      <p>
        On your backend API routes, simply wrap your standard Next.js Route Handler with <code>withIsogeny</code>. 
        It automatically decrypts the incoming body and encrypts your return value.
      </p>

      <pre className="bg-foreground text-background p-4 rounded-xl overflow-x-auto">
        <code>{`import { withIsogeny } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export const POST = withIsogeny(async (request: Request, decryptedBody: any) => {
  // decryptedBody contains the raw JSON sent by the client.
  console.log('Received:', decryptedBody.password);

  // You just return a JSON object!
  // The wrapper will automatically encrypt this before sending it back.
  return { success: true, status: 'Data secured.' };
});`}</code>
      </pre>
    </>
  );
}
