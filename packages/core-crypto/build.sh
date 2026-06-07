#!/bin/bash
set -e

# Compile the core cryptography Rust crate into WebAssembly.

echo "Building Wasm for Node.js / Serverless environments..."
wasm-pack build --target nodejs --out-dir ../../pkg/node

echo "Building Wasm for Browser / Bundler environments..."
# --scope withnen names the generated package "@withnen/core-crypto" so it can be
# published to npm and resolved by external consumers (client + server depend on
# it by version). In the monorepo, pkg/bundler is registered as a workspace, so
# local dev keeps using this freshly-built copy.
wasm-pack build --target bundler --scope withnen --out-dir ../../pkg/bundler

echo "Making the bundler package publishable (@withnen/core-crypto)..."
node -e '
  const fs = require("fs");
  const p = "../../pkg/bundler/package.json";
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  d.name = "@withnen/core-crypto";
  d.license = "MIT";
  d.author = "Nen <hello@withnen.com>";
  d.homepage = "https://withnen.com";
  d.repository = {
    type: "git",
    url: "git+https://github.com/navneet1395/nen.git",
    directory: "packages/core-crypto"
  };
  d.publishConfig = { access: "public" };
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
'

echo "Wasm build complete! Bundles output to /pkg/"
echo "  pkg/bundler  -> @withnen/core-crypto (published to npm; used by client + server)"
echo "  pkg/node     -> core-crypto (local-only, referenced by jest moduleNameMapper)"
