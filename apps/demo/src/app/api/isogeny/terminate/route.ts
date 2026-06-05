import { handleTerminate } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleTerminate(request);
}
