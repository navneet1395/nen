# Isogeny Demo Application

This is a Next.js 15 App Router project demonstrating the capabilities of the Isogeny SDK.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

- `src/app/api/isogeny/`: The lifecycle API routes (`/handshake`, `/status`, `/terminate`).
- `src/app/api/secure-data/`: An example business logic endpoint secured by the `withIsogeny` server wrapper.
- `src/app/page.tsx`: The client-side application utilizing `@isogeny/client` to execute post-quantum encrypted fetches to the server.
