import * as nenCrypto from '@withnen/core-crypto';

/**
 * Session resumption (NEN-PROTOCOL-V3, T4).
 *
 * A reconnect can skip the ML-KEM handshake. At handshake both sides derive a
 * resumption secret `psk = HKDF(ss, "nen/v3 resume")` (never transmitted). The
 * server also seals `psk` into an opaque, **stateless** ticket (AEAD under a
 * process-level ticket key) and hands it to the client. On resume the client
 * sends the ticket plus a fresh nonce; the server opens the ticket to recover
 * `psk`, both sides mix in fresh client+server nonces, and derive a brand-new
 * `ss' = HKDF(psk || client_rn || server_rn, "nen/v3 resume-ss")` → fresh keys.
 *
 * Forward-secrecy trade-off (documented): a leaked `psk` compromises sessions
 * resumed from it. We bound that with a short ticket TTL (10 min default) and
 * per-resume nonces. For multi-instance deployments, share the ticket key across
 * nodes via `setTicketKey` so any node can open a ticket sealed by another.
 */

const RESUME_PSK_INFO = 'nen/v3 resume'; // psk = HKDF(ss, this) — MUST match client
const RESUME_SS_INFO = 'nen/v3 resume-ss'; // ss' = HKDF(psk || c_rn || s_rn, this)
const DEFAULT_TICKET_TTL_MS = 10 * 60 * 1000;

let _ticketKey: Uint8Array | null = null;
function ticketKey(): Uint8Array {
  if (!_ticketKey) {
    _ticketKey = new Uint8Array(32);
    crypto.getRandomValues(_ticketKey);
  }
  return _ticketKey;
}

/** Share the ticket-sealing key across instances so any node can resume. */
export function setTicketKey(key: Uint8Array): void {
  _ticketKey = key;
}

/** psk derived from the (hybrid) shared secret. Never transmitted. */
export function deriveResumptionPsk(combinedSs: Uint8Array): Uint8Array {
  return nenCrypto.nen_hkdf(combinedSs, RESUME_PSK_INFO, 32);
}

/** Fresh per-resume session secret, mixing both sides' nonces. */
export function deriveResumeSs(psk: Uint8Array, clientRn: Uint8Array, serverRn: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(psk.length + clientRn.length + serverRn.length);
  ikm.set(psk, 0);
  ikm.set(clientRn, psk.length);
  ikm.set(serverRn, psk.length + clientRn.length);
  return nenCrypto.nen_hkdf(ikm, RESUME_SS_INFO, 32);
}

/** Seal `{ psk, exp }` under the ticket key → opaque `"<nonce>.<ct>"` base64. */
export function sealTicket(psk: Uint8Array, ttlMs: number = DEFAULT_TICKET_TTL_MS): string {
  const payload = new TextEncoder().encode(
    JSON.stringify({ psk: nenCrypto.nen_to_base64(psk), exp: Date.now() + ttlMs }),
  );
  const nonce = nenCrypto.nen_generate_nonce();
  const ct = nenCrypto.nen_encrypt(ticketKey(), nonce, payload);
  return `${nenCrypto.nen_to_base64(nonce)}.${nenCrypto.nen_to_base64(ct)}`;
}

/** Open a ticket → the psk if the AEAD verifies and it hasn't expired, else null. */
export function openTicket(ticket: string): Uint8Array | null {
  try {
    const dot = ticket.indexOf('.');
    if (dot <= 0) return null;
    const nonce = nenCrypto.nen_from_base64(ticket.slice(0, dot));
    const ct = nenCrypto.nen_from_base64(ticket.slice(dot + 1));
    const pt = nenCrypto.nen_decrypt(ticketKey(), nonce, ct);
    const parsed = JSON.parse(new TextDecoder().decode(pt));
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null;
    return nenCrypto.nen_from_base64(parsed.psk);
  } catch {
    return null;
  }
}
