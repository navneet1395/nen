import { withNen } from '@withnen/server';

export const POST = withNen(async (req, body) => {
  return {
    message: 'Securely processed',
    received: body
  };
});
