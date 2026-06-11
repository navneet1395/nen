import { withNen } from '@withnen/server';
import { createClient } from 'redis';

/**
 * POST /api/feedback — capture an answer from the Nen feedback widget.
 * Now wrapped in `withNen` to dogfood our own product and securely transmit
 * the telemetry, saving the results to Redis.
 */

interface FeedbackPayload {
  questionId?: unknown;
  optionIndex?: unknown;
  path?: unknown;
}

export const POST = withNen(async (req, body) => {
  const payload = body as FeedbackPayload;

  const questionId = typeof payload.questionId === "string" ? payload.questionId.slice(0, 32) : null;
  const optionIndex = typeof payload.optionIndex === "number" ? payload.optionIndex : null;
  const path = typeof payload.path === "string" ? payload.path.slice(0, 128) : null;

  if (!questionId || optionIndex === null) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  try {
    if (process.env.REDIS_URL) {
      const redis = await createClient({ url: process.env.REDIS_URL }).connect();
      // Use an atomic increment in a Redis Hash.
      // Hash key: 'feedback_metrics', Field: questionId:optionIndex, Increment by: 1
      await redis.hIncrBy('feedback_metrics', `${questionId}:${optionIndex}`, 1);
      await redis.disconnect(); // clean up connection in serverless
    } else {
      console.warn("REDIS_URL is not set. Feedback was not saved.");
    }
  } catch (error) {
    console.error("Failed to insert feedback to Vercel KV:", error);
    // Continue execution to return ok: true and structured log even if DB fails
  }

  // Structured log — picked up by Vercel log drains / analytics without a DB.
  console.log(
    JSON.stringify({
      type: "nen_feedback",
      questionId,
      optionIndex,
      path,
      at: new Date().toISOString(),
    }),
  );

  return Response.json({ ok: true });
});
