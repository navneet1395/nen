import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Opt out of caching so we always get the latest metrics
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.REDIS_URL) {
      return NextResponse.json({ data: [] });
    }

    const redis = await createClient({ url: process.env.REDIS_URL }).connect();
    const hash = await redis.hGetAll('feedback_metrics');
    await redis.disconnect(); // clean up connection in serverless
    
    if (!hash || Object.keys(hash).length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Convert the hash record Record<string, string> to the expected array format
    // hash is something like { 'home:0': '5', 'home:1': '2' }
    const aggregated: Record<string, Record<string, number | string>> = {};

    for (const [key, value] of Object.entries(hash)) {
      if (!key.includes(':')) continue; // Skip legacy data from before we tracked options
      
      const [questionId, optionIndex] = key.split(':');
      const count = Number(value);

      if (!aggregated[questionId]) {
        aggregated[questionId] = { question_id: questionId, total: 0 };
      }

      aggregated[questionId][`option_${optionIndex}`] = count;
      aggregated[questionId].total = (aggregated[questionId].total as number) + count;
    }

    const rows = Object.values(aggregated).sort((a, b) => (b.total as number) - (a.total as number));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("Failed to fetch feedback metrics from Redis:", err);
    // Return empty array instead of 500 so the UI doesn't break if DB is uninitialized
    return NextResponse.json({ data: [] });
  }
}
