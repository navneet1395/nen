// Statistics helpers for the Isogeny benchmark harness.

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1)
  );
  return sortedAsc[idx];
}

/** Summarize an array of latency samples (ms). */
function summarize(samples) {
  if (!samples.length) {
    return { count: 0, min: 0, mean: 0, p50: 0, p90: 0, p99: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const round = (n) => +n.toFixed(3);
  return {
    count: sorted.length,
    min: round(sorted[0]),
    mean: round(sum / sorted.length),
    p50: round(percentile(sorted, 50)),
    p90: round(percentile(sorted, 90)),
    p99: round(percentile(sorted, 99)),
    max: round(sorted[sorted.length - 1]),
  };
}

module.exports = { percentile, summarize };
