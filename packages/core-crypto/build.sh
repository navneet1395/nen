#!/bin/bash
set -e

# Compile the core cryptography Rust crate into WebAssembly.

echo "Building Wasm for Node.js / Serverless environments..."
wasm-pack build --target nodejs --out-dir ../../pkg/node

echo "Building Wasm for Browser / Bundler environments..."
wasm-pack build --target bundler --out-dir ../../pkg/bundler

echo "Wasm build complete! Bundles output to /pkg/"
