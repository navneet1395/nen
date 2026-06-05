import { handleHandshake } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Pass the raw Request object to our generic middleware handler
  return handleHandshake(request);
}
