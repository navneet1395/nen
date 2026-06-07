import { SessionStore } from '../store';
import * as nenCrypto from '@withnen/core-crypto';

/**
 * Upstash REST session store.
 *
 * Talks to the Upstash Redis REST API directly over `fetch` — no TCP socket and
 * no `@upstash/redis` dependency — so it runs in any Edge runtime (Cloudflare
 * Workers, Vercel Edge, Deno). Pass the REST URL and token from your Upstash
 * dashboard (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 *
 *   import { setSessionStore } from '@withnen/server';
 *   import { UpstashSessionStore } from '@withnen/server';
 *
 *   setSessionStore(new UpstashSessionStore(
 *     process.env.UPSTASH_REDIS_REST_URL!,
 *     process.env.UPSTASH_REDIS_REST_TOKEN!,
 *   ));
 */
export class UpstashSessionStore implements SessionStore {
  private url: string;
  private token: string;
  private prefix: string;
  private ttlSeconds: number;

  constructor(restUrl: string, restToken: string, prefix = 'nen:session:', ttlSeconds = 3600) {
    // Normalize: drop a trailing slash so command paths concatenate cleanly.
    this.url = restUrl.replace(/\/$/, '');
    this.token = restToken;
    this.prefix = prefix;
    this.ttlSeconds = ttlSeconds;
  }

  /** Send a single Redis command to the Upstash REST endpoint. */
  private async cmd<T = unknown>(command: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      throw new Error(`Upstash REST request failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) {
      throw new Error(`Upstash error: ${json.error}`);
    }
    return json.result as T;
  }

  async set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    const sessionData = JSON.stringify({
      sharedSecret: nenCrypto.nen_to_base64(sharedSecret),
      hmacKey: nenCrypto.nen_to_base64(hmacKey),
      createdAt: Date.now(),
    });
    await this.cmd(['SET', key, sessionData, 'EX', this.ttlSeconds]);
  }

  async get(sessionId: string): Promise<{ sharedSecret: Uint8Array; hmacKey: Uint8Array } | null> {
    const key = `${this.prefix}${sessionId}`;
    const dataStr = await this.cmd<string | null>(['GET', key]);
    if (!dataStr) return null;
    try {
      const session = JSON.parse(dataStr);
      return {
        sharedSecret: nenCrypto.nen_from_base64(session.sharedSecret),
        hmacKey: nenCrypto.nen_from_base64(session.hmacKey),
      };
    } catch (e) {
      console.error('Failed to parse Nen session from Upstash', e);
      return null;
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const result = await this.cmd<number>(['DEL', `${this.prefix}${sessionId}`]);
    return result > 0;
  }

  async exists(sessionId: string): Promise<boolean> {
    const result = await this.cmd<number>(['EXISTS', `${this.prefix}${sessionId}`]);
    return result > 0;
  }

  async hasNonce(sessionId: string, nonce: string): Promise<boolean> {
    const key = `${this.prefix}${sessionId}:nonces`;
    const result = await this.cmd<number>(['SISMEMBER', key, nonce]);
    return result > 0;
  }

  async trackNonce(sessionId: string, nonce: string): Promise<void> {
    const key = `${this.prefix}${sessionId}:nonces`;
    await this.cmd(['SADD', key, nonce]);
    // Expire the nonce set alongside the session so it can't grow unbounded.
    await this.cmd(['EXPIRE', key, this.ttlSeconds]);
  }
}
