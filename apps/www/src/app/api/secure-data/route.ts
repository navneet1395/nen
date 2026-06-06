import { withNen } from '@nen/server';

export const POST = withNen(async (req, body) => {
  return {
    message: 'Securely processed',
    received: body
  };
});
