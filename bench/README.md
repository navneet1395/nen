# Nen benchmark & regression harness

Drives the encrypted CRUD demo app (`apps/www/src/app/api/notes/*`) through the
**public SDK** the same way the docs do (`handshake()` → `nenFetch()`), so the
numbers reflect what a real integrator experiences.

## Run

```bash
# 1. Start the demo app (separate terminal)
cd apps/www && npx next dev -p 3005
#   …or for realistic numbers: npx next build && npx next start -p 3005

# 2. Run the full suite (saves a timestamped run under bench/results/)
cd ../.. && TARGET_URL=http://localhost:3005 node bench/run-all.js
```

Individual suites: `node bench/regression.js`, `node bench/loadtest.js`,
`node bench/profile.js`.

## What each suite measures

| Suite | Answers |
|-------|---------|
| `regression` | Does the full CRUD lifecycle work E2E-encrypted? Are tampered HMAC, replay, and dead-session requests rejected? Plus documented SDK limitations. |
| `loadtest` | How many concurrent encrypted requests can one instance sustain, and where does throughput saturate? (latency p50/p90/p99, error rate, server RSS) |
| `profile` | Where does time go — handshake vs per-request crypto — and how does latency/wire-overhead scale with payload size? |

## Tuning (env vars)

- `TARGET_URL` (default `http://localhost:3005`)
- `LEVELS` e.g. `10,50,100,200` — concurrency steps for the load test
- `REQUESTS_PER_LEVEL` (default `1000`)
- `PROFILE_ITERS` (default `100`)

> macOS open-file limit is low (often 256). Raise it with `ulimit -n 4096`
> before high-concurrency runs, or errors will appear as client-side socket
> exhaustion rather than server failures.

## Output

Each run writes `bench/results/<timestamp>/` (and mirrors to
`bench/results/latest/`):

- `summary.json` — everything, machine-readable
- `REPORT.md` — human-readable report incl. a **Weaknesses & follow-ups** section
- `marketing-summary.json` — headline numbers + claims for the website
- `regression.json`, `loadtest.json`, `profile.json` — raw per-suite data
