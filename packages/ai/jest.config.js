const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // @isogeny/client (pulled in transitively) imports the `core-crypto` wasm
  // package, whose published `bundler` build is ESM and cannot load in jest.
  // Map it to the equivalent Node/CommonJS wasm build for tests only.
  moduleNameMapper: {
    "^@withnen/core-crypto$": "<rootDir>/../../pkg/node/core_crypto.js",
  },
};
