/**
 * POST /api/feedback — capture an anonymous answer from the Nen feedback widget.
 *
 * Deliberately NOT wrapped in `withNen`: this is anonymous, no-PII product
 * telemetry (which question, which answer, which page) — there is no session
 * and nothing sensitive to encrypt. We only accept a known question id +
 * an option index, so a client can't smuggle free-text PII through here.
 */

interface FeedbackPayload {
  questionId?: unknown;
  optionIndex?: unknown;
  path?: unknown;
}

export async function POST(req: Request) {
  let body: FeedbackPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const questionId = typeof body.questionId === "string" ? body.questionId.slice(0, 32) : null;
  const optionIndex = typeof body.optionIndex === "number" ? body.optionIndex : null;
  const path = typeof body.path === "string" ? body.path.slice(0, 128) : null;

  if (!questionId || optionIndex === null) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 400 });
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
}
