import { handleRotate } from '@isogeny/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleRotate(request);
}
