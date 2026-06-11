---
name: release
description: Run the Nen release pipeline — rebuild Wasm + packages, run all tests, guard against stale identifiers, publish changed npm packages, commit, push, and deploy to Vercel. Use when the user says "release", "ship it", "publish", "cut a release", or "deploy the packages and site".
---

# Release

One command takes a change all the way out: **wasm → build → test → stale-name guard → publish → commit → push → deploy.**

## How to run it

The whole pipeline lives in `scripts/release.sh` (idempotent — it skips npm versions already published). Prefer it over doing the steps by hand.

```bash
# full release (will prompt before the Vercel deploy)
scripts/release.sh -m "feat: <what changed>"

# common variants
scripts/release.sh -m "docs: tweak" --skip-publish     # build/test/deploy, no npm publish
scripts/release.sh --skip-wasm -m "fix: ts only"        # reuse committed pkg/ (no Rust rebuild)
scripts/release.sh --no-push                            # build/test/publish locally, stop before push
scripts/release.sh -y -m "chore: release"               # no prompts
```

`NPM_TOKEN` is read from the environment if set; otherwise it uses the current `npm login`.

## What it enforces (don't bypass these)

1. **Rebuild before ship** — regenerates the Wasm `pkg/` and each package `dist/` so nothing stale goes out.
2. **Green tests gate the release** — `@withnen/{server,client,ai}` must all pass.
3. **Stale-identifier guard** — greps for `isogeny` / `withIsogeny` / `pqcfetch` and aborts if any remain (the exact bug that once broke a Vercel deploy).
4. **Idempotent publish** — only versions not already on npm are published, in dependency order (`@withnen/core-crypto` first).

## When NOT to use

- Pure marketing-site copy with no SDK change → `npx vercel --prod` is enough (or `scripts/release.sh --skip-publish`).
- If a version bump is needed, bump the relevant `package.json` versions **first**, then run the skill.

## After running

Confirm: npm shows the new versions, the site is live at withnen.com, and `git log` shows the release commit pushed. If the stale-identifier guard fired, run `packages/core-crypto/build.sh` and the per-workspace builds, then retry.
