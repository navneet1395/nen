# create-isogeny-app

The scaffolding CLI for Isogeny. Wires post-quantum, end-to-end encrypted API
calls into a Next.js App Router project in one command.

## Usage

```bash
npx create-isogeny-app
```

It will:

- install `@isogeny/client` and `@isogeny/server`,
- patch `next.config.ts` for WebAssembly (`asyncWebAssembly`),
- generate the session routes (`/api/isogeny/[action]` → handshake / rotate /
  terminate / status),
- generate a protected example route and a client snippet,
- print next steps.

After it finishes, swap `fetch` for `pqcfetch` on the client and wrap your routes
with `withIsogeny` on the server — see the
[client](../isogeny-client) and [server](../isogeny-server) READMEs.

## Develop

```bash
npm run build    # tsup → dist/index.js (the bin)
npm run dev      # watch mode
npm start        # run the built CLI locally
```

Entry point: `src/index.ts`. Built with `tsup`; dependencies: `prompts`,
`picocolors`, `commander`.
