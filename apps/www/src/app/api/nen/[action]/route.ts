import { handleHandshake, handleTerminate, handleStatus, handleRotate, handleRekey } from '@withnen/server';

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> | { action: string } }) {
  // Await the params for Next.js 15+ compatibility
  const resolvedParams = await Promise.resolve(params);
  
  switch (resolvedParams.action) {
    case 'handshake':
      return handleHandshake(req);
    case 'terminate':
      return handleTerminate(req);
    case 'rotate':
      return handleRotate(req);
    case 'rekey':
      return handleRekey(req);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> | { action: string } }) {
  const resolvedParams = await Promise.resolve(params);
  
  if (resolvedParams.action === 'status') {
    return handleStatus(req);
  }
  
  return new Response('Not Found', { status: 404 });
}
