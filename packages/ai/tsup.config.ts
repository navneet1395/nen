import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/client.ts', 'src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
});
