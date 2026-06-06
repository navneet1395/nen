# create-nen-app

The scaffolding CLI for Nen. Wires post-quantum, end-to-end encrypted API
calls into a Next.js App Router project in one command.

## Usage

```bash
npx create-nen-app
```

It will:

- install `@nen/client` and `@nen/server`,
- patch `next.config.ts` for WebAssembly (`asyncWebAssembly`),
- generate the session routes (`/api/nen/[action]` → handshake / rotate /
  terminate / status),
- generate a protected example route and a client snippet,
- print next steps.

After it finishes, swap `fetch` for `nenfetch` on the client and wrap your routes
with `withNen` on the server — see the
[client](../nen-client) and [server](../nen-server) READMEs.

## Develop

```bash
npm run build    # tsup → dist/index.js (the bin)
npm run dev      # watch mode
npm start        # run the built CLI locally
```

Entry point: `src/index.ts`. Built with `tsup`; dependencies: `prompts`,
`picocolors`, `commander`.
