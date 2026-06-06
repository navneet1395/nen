import { SessionStore } from '../store';
import * as nenCrypto from 'core-crypto';

/**
 * Interface representing a minimal Redis client (like Upstash Redis)
 */
export interface MinimalRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<string | null | "OK">;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  sismember(key: string, member: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export class RedisSessionStore implements SessionStore {
  private redis: MinimalRedisClient;
  private prefix: string;
  private expiryMs: number;

  constructor(redisClient: MinimalRedisClient, prefix = 'nen:session:', expiryMs = 3600000) {
    this.redis = redisClient;
    this.prefix = prefix;
    this.expiryMs = expiryMs;
  }

  async set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    const sessionData = {
      sharedSecret: nenCrypto.nen_to_base64(sharedSecret),
      hmacKey: nenCrypto.nen_to_base64(hmacKey),
      createdAt: Date.now()
    };
    
    await this.redis.set(key, JSON.stringify(sessionData), { ex: Math.floor(this.expiryMs / 1000) });
  }

  async get(sessionId: string): Promise<{ sharedSecret: Uint8Array; hmacKey: Uint8Array } | null> {
    const key = `${this.prefix}${sessionId}`;
    const dataStr = await this.redis.get(key);
    
    if (!dataStr) return null;
    
    try {
      const session = JSON.parse(dataStr);
      return {
        sharedSecret: nenCrypto.nen_from_base64(session.sharedSecret),
        hmacKey: nenCrypto.nen_from_base64(session.hmacKey)
      };
    } catch (e) {
      console.error('Failed to parse Nen session from Redis', e);
      return null;
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const key = `${this.prefix}${sessionId}`;
    const result = await this.redis.del(key);
    return result > 0;
  }

  async exists(sessionId: string): Promise<boolean> {
    const key = `${this.prefix}${sessionId}`;
    const result = await this.redis.exists(key);
    return result > 0;
  }

  async hasNonce(sessionId: string, nonce: string): Promise<boolean> {
    const key = `${this.prefix}${sessionId}:nonces`;
    const result = await this.redis.sismember(key, nonce);
    return result > 0;
  }

  async trackNonce(sessionId: string, nonce: string): Promise<void> {
    const key = `${this.prefix}${sessionId}:nonces`;
    await this.redis.sadd(key, nonce);
    // Ensure the nonces set expires alongside the session
    await this.redis.expire(key, Math.floor(this.expiryMs / 1000));
  }
}
