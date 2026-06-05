import { handleStatus } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleStatus(request);
}
