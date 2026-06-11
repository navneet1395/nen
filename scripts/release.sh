#!/usr/bin/env bash
#
# release.sh — one-shot release pipeline for Nen.
#
# Builds the Wasm core + TS packages, runs every test, publishes the changed
# npm packages, commits + pushes, and deploys the site to Vercel — in order,
# stopping at the first failure.
#
# Usage:
#   scripts/release.sh [options]
#
# Options:
#   --skip-wasm       Don't rebuild the Rust→Wasm core (use the committed pkg/).
#   --skip-publish    Build/test/deploy but do NOT publish to npm.
#   --skip-deploy     Everything except the Vercel deploy.
#   --no-push         Commit locally but don't push or deploy.
#   -m "msg"          Commit message (default: "chore: release").
#   -y                Don't prompt for confirmation.
#   -h, --help        Show this help.
#
# Env:
#   NPM_TOKEN         npm automation/granular token (else uses your npm login).
#
# Requires: node, npm, cargo + wasm-pack (unless --skip-wasm), git, npx vercel.

set -euo pipefail

# ── locate repo root (this script lives in <root>/scripts) ───────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── options ──────────────────────────────────────────────────────────────────
SKIP_WASM=0; SKIP_PUBLISH=0; SKIP_DEPLOY=0; NO_PUSH=0; ASSUME_YES=0
COMMIT_MSG="chore: release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-wasm)    SKIP_WASM=1 ;;
    --skip-publish) SKIP_PUBLISH=1 ;;
    --skip-deploy)  SKIP_DEPLOY=1 ;;
    --no-push)      NO_PUSH=1 ;;
    -m)             COMMIT_MSG="$2"; shift ;;
    -y)             ASSUME_YES=1 ;;
    -h|--help)      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# Publishable packages, in dependency order (core-crypto FIRST).
PKG_DIRS=( "pkg/bundler" "packages/nen-client" "packages/nen-server" "packages/ai" )

c() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }   # cyan step header
ok() { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }
die() { printf "\n\033[1;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

confirm() {
  [[ "$ASSUME_YES" == "1" ]] && return 0
  read -r -p "$1 [y/N] " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

# ── 1. Wasm core ─────────────────────────────────────────────────────────────
if [[ "$SKIP_WASM" == "0" ]]; then
  c "Building Wasm core (core-crypto)"
  ( cd packages/core-crypto && ./build.sh ) || die "Wasm build failed"
  ok "Wasm core built"
else
  c "Skipping Wasm build (--skip-wasm)"
fi

# ── 2. Install + build TS packages ───────────────────────────────────────────
c "npm install (link workspaces)"
npm install || die "npm install failed"

c "Building TS packages"
npm run build --workspace @withnen/server
npm run build --workspace @withnen/client
npm run build --workspace @withnen/ai
ok "Packages built"

# ── 3. Tests ─────────────────────────────────────────────────────────────────
c "Running tests"
npm test --workspace @withnen/server
npm test --workspace @withnen/client
npm test --workspace @withnen/ai
ok "All tests passed"

# ── 3b. Stale-identifier guard ───────────────────────────────────────────────
# A Vercel deploy once failed because old names lingered in the GENERATED build
# outputs (dist/, pkg/) after a rename — while source was already clean. We grep
# the build outputs specifically, so legit history mentions in source/docs don't
# trip it.
c "Checking build outputs for stale identifiers (isogeny / withIsogeny / pqcfetch)"
stale_targets=( packages/*/dist pkg )
if grep -rIn -E 'isogeny|withIsogeny|pqcfetch|@isogeny' "${stale_targets[@]}" \
     >/tmp/nen-stale.txt 2>/dev/null; then
  echo "  ⚠ stale references in build outputs (rebuild before releasing):"
  cut -c1-100 /tmp/nen-stale.txt | sed 's/^/    /' | head -12
  die "stale identifiers in dist/pkg — rebuild the affected package(s) and retry"
fi
ok "Build outputs clean"

# ── 4. Publish to npm ────────────────────────────────────────────────────────
if [[ "$SKIP_PUBLISH" == "0" ]]; then
  if [[ -n "${NPM_TOKEN:-}" ]]; then
    npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
  fi
  c "Publishing changed packages to npm"
  for dir in "${PKG_DIRS[@]}"; do
    name=$(node -p "require('./$dir/package.json').name")
    ver=$(node -p "require('./$dir/package.json').version")
    published=$(npm view "$name@$ver" version 2>/dev/null || true)
    if [[ "$published" == "$ver" ]]; then
      echo "  • $name@$ver already on npm — skipping"
    else
      echo "  • publishing $name@$ver"
      ( cd "$dir" && npm publish --access public ) || die "publish failed: $name@$ver"
    fi
  done
  ok "Publish step complete"
else
  c "Skipping npm publish (--skip-publish)"
fi

# ── 5. Commit + push ─────────────────────────────────────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  c "Committing changes"
  git add -A
  git commit -m "$COMMIT_MSG" || true
  ok "Committed: $COMMIT_MSG"
else
  echo "  • working tree clean — nothing to commit"
fi

if [[ "$NO_PUSH" == "0" ]]; then
  c "Pushing to origin"
  git push || die "git push failed"
  ok "Pushed"
else
  c "Skipping push (--no-push)"
  exit 0
fi

# ── 6. Deploy to Vercel ──────────────────────────────────────────────────────
if [[ "$SKIP_DEPLOY" == "0" ]]; then
  if confirm "Deploy to Vercel production now?"; then
    c "Deploying to Vercel (production)"
    npx vercel --prod --yes || die "Vercel deploy failed"
    ok "Deployed → https://www.withnen.com"
  else
    echo "  • skipped deploy"
  fi
else
  c "Skipping deploy (--skip-deploy)"
fi

printf "\n\033[1;32m✓ Release pipeline complete.\033[0m\n"
