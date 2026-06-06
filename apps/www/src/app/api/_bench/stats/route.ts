/**
 * GET /api/_bench/stats — UNAUTHENTICATED bench-only telemetry.
 *
 * Exposes the server process's memory / cpu / uptime so the load + profile
 * harness in /bench can sample server-side RSS while it drives traffic. This is
 * a benchmarking aid, not a product endpoint — it is namespaced under `_bench`
 * and must never be deployed to production.
 */
export async function GET() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  return Response.json({
    ts: Date.now(),
    uptimeSec: process.uptime(),
    pid: process.pid,
    memory: {
      rssMB: +(mem.rss / 1048576).toFixed(2),
      heapUsedMB: +(mem.heapUsed / 1048576).toFixed(2),
      heapTotalMB: +(mem.heapTotal / 1048576).toFixed(2),
      externalMB: +(mem.external / 1048576).toFixed(2),
    },
    cpu: { userUs: cpu.user, systemUs: cpu.system },
    node: process.version,
  });
}
