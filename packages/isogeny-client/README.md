# @isogeny/client

The official browser SDK for Isogeny, a Post-Quantum Cryptography middleware.

## Installation

```bash
npm install @isogeny/client
```

## Usage

```typescript
import { IsogenyClient } from '@isogeny/client';

const client = new IsogenyClient('http://localhost:3000');

// 1. Establish the Post-Quantum Shared Secret via ML-KEM
await client.handshake();

// 2. Transmit data securely
const response = await client.pqcfetch('/api/secure-data', {
  method: 'POST',
  body: JSON.stringify({ password: 'super_secret' })
});

console.log("Server responded securely:", response);
```

## Features
- **WebAssembly Powered:** Runs ML-KEM (Kyber-768) natively in the browser.
- **Auto-Rotation:** Automatically intercepts expired sessions (401), rotates the symmetric key, and retries the request seamlessly.
- **Perfect Forward Secrecy:** Exposes `client.terminate()` to instantly destroy keys when users log out.
