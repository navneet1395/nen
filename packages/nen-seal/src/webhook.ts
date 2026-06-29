/**
 * Nen for Webhooks — encrypted + signed webhook delivery.
 *
 * A webhook body fans out through queues, retries, proxies, and the receiver's
 * logs — all places it sits in plaintext today. Here the sender seals the body
 * to the receiver's published ML-KEM key and signs it with its ML-DSA key; the
 * receiver verifies the signer and opens it. Built entirely on the signed
 * envelope primitive — this layer only adds the HTTP conventions.
 */
import { sealSigned, openSigned, NenKeypair, NenSignedEnvelope } from './index';

/** Header carrying the event type (also bound into the envelope context). */
export const WEBHOOK_EVENT_HEADER = 'x-nen-event';

export interface SealedWebhook {
  /** Headers to send with the POST (merge into your request). */
  headers: Record<string, string>;
  /** JSON string body — a signed Nen envelope. */
  body: string;
}

/**
 * Seal + sign a webhook for `recipientPublicKey`. The event type is bound into
 * the envelope context, so a `payment.succeeded` envelope can never be replayed
 * as a different event.
 */
export function sealWebhook(
  recipientPublicKey: Uint8Array,
  eventType: string,
  payload: unknown,
  signer: NenKeypair
): SealedWebhook {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const env = sealSigned(recipientPublicKey, data, signer, { context: `webhook:${eventType}` });
  return {
    headers: {
      'content-type': 'application/json',
      [WEBHOOK_EVENT_HEADER]: eventType,
    },
    body: JSON.stringify(env),
  };
}

export interface OpenWebhookOptions {
  /**
   * Pin the sender: the envelope's signer key must equal this. Strongly
   * recommended — without it any validly self-signed envelope is accepted.
   */
  signerPublicKey?: Uint8Array;
  /**
   * If given, the envelope's bound event must match (defends against an
   * attacker re-pointing the body at another handler).
   */
  expectedEvent?: string;
}

export interface OpenedWebhook<T = unknown> {
  event: string | undefined;
  payload: T;
}

/**
 * Verify and open a received webhook body. Throws if the signature is invalid,
 * the signer is not the pinned one, or the bound event doesn't match.
 */
export function openWebhook<T = unknown>(
  recipientSecretKey: Uint8Array,
  body: string,
  opts: OpenWebhookOptions = {}
): OpenedWebhook<T> {
  const env = JSON.parse(body) as NenSignedEnvelope;

  // The event is authenticated via the envelope context (env.ctx = webhook:<event>).
  const boundEvent = env.ctx?.startsWith('webhook:') ? env.ctx.slice('webhook:'.length) : undefined;
  if (opts.expectedEvent && boundEvent !== opts.expectedEvent) {
    throw new Error(
      `nen/webhook: event mismatch (expected "${opts.expectedEvent}", got "${boundEvent ?? 'none'}")`
    );
  }

  const data = openSigned(recipientSecretKey, env, opts.signerPublicKey);
  return { event: boundEvent, payload: JSON.parse(new TextDecoder().decode(data)) as T };
}
