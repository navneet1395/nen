# Nen — Marketing & Docs Site (`www`)

The Next.js (App Router) marketing site and documentation for Nen.

## Develop

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure

```
src/app/
  page.tsx                 Home — story flow + interactive PayloadDemo
  why-not-cloudflare/      The "TLS + Nen" positioning page
  ai/                      Secure AI wedge page
  pricing/                 Three tiers (OSS / Cloud / Enterprise)
  docs/                    MDX docs (quickstart, usage, protocol, threat-model,
                           audit-readiness, crypto, architecture, error-codes)
  api/                     Demo Nen routes (handshake + secure-data + stream)
src/components/            Site chrome, code-block (copy button), flow diagrams, demos
src/mdx-components.tsx     Styled MDX table/pre/link overrides
```

Docs render Markdown tables via `remark-gfm` (configured in `next.config.ts`).
Code blocks get a copy button via the `pre` override in `mdx-components.tsx`.

## Diagrams

The flow diagrams are authored in [D2](https://d2lang.com/) under `d2/`:

1. `ai-flow.d2`
2. `data-transport.d2`
3. `handshake.d2`
4. `trust-boundary.d2`

Edit a `.d2` file, then regenerate the SVGs into `public/flows/`:

```bash
npm run build:diagrams   # runs scripts/generate-flows.sh (needs the d2 CLI)
```

> The vendored `d2-v0.7.1/` toolchain is git-ignored (45 MB). Install the
> [d2 CLI](https://d2lang.com/tour/install) separately to regenerate diagrams.

## Content guidelines

Keep claims precise and **additive** — "TLS + Nen", never "TLS is wrong".
Never overclaim: everything *between* the two endpoints is ciphertext, the
endpoints hold plaintext by design, and the AI page must not imply the model
provider is blind to prompts. See `../../THREAT_MODEL.md`.
