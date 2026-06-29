const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // jest can't load the published bundler-target ESM wasm; map to the Node build.
  moduleNameMapper: {
    "^@withnen/core-crypto$": "<rootDir>/../../pkg/node/core_crypto.js",
  },
};
