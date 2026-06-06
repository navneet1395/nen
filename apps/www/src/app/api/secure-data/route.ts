import { withIsogeny } from '@isogeny/server';

export const POST = withIsogeny(async (req, body) => {
  return {
    message: 'Securely processed',
    received: body
  };
});
