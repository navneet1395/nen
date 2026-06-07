const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // The published `core-crypto` dependency points at the `bundler` wasm target,
  // whose ESM `import * as wasm from "*.wasm"` syntax cannot be loaded by jest.
  // Map it to the equivalent Node/CommonJS wasm build for tests only.
  moduleNameMapper: {
    "^@withnen/core-crypto$": "<rootDir>/../../pkg/node/core_crypto.js",
  },
};