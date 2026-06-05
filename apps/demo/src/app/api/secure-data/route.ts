import { withIsogeny } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export const POST = withIsogeny(async (request: Request, decryptedBody: any) => {
  // 1. Log the decrypted payload
  console.log('Server received decrypted payload:', decryptedBody);

  // 2. Process data (Your Business Logic here)
  const responsePayload = {
    message: "Hello from Isogeny Serverless Middleware (Using DX Wrapper)!",
    received: decryptedBody,
    timestamp: new Date().toISOString()
  };

  // 3. Just return the JSON object! The wrapper will automatically encrypt it 
  // with the Post-Quantum Shared Secret for this specific user session.
  return responsePayload;
});
