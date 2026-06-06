import { withNenStream } from '@nen/server';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example: An encrypted streaming route returning server sent events
export const POST = withNenStream(async (req, body) => {
  // Return a ReadableStream that generates SSE chunks
  const stream = new ReadableStream({
    async start(controller) {
      const messages = [
        "Initializing secure sequence...",
        "Fetching sensitive records...",
        "Processing data chunk 1...",
        "Processing data chunk 2...",
        "Finalizing transaction..."
      ];

      for (const msg of messages) {
        controller.enqueue(msg);
        await sleep(500); // Simulate processing time
      }
      controller.close();
    }
  });

  return new Response(stream);
});
