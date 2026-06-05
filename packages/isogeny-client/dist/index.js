"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  IsogenyClient: () => IsogenyClient
});
module.exports = __toCommonJS(index_exports);
var isogenyCrypto = __toESM(require("core-crypto"));
var IsogenyClient = class {
  sharedSecret = null;
  sessionId = null;
  serverUrl;
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
  }
  /**
   * Performs the ML-KEM handshake with the server.
   */
  async handshake() {
    const keypair = isogenyCrypto.isogeny_generate_keypair();
    const publicKey = keypair.public_key;
    const secretKey = keypair.secret_key;
    const response = await fetch(`${this.serverUrl}/api/isogeny/handshake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: Array.from(publicKey)
        // Send as array of bytes
      })
    });
    if (!response.ok) {
      throw new Error(`Handshake failed: ${response.statusText}`);
    }
    const data = await response.json();
    this.sessionId = data.sessionId;
    const ciphertext = new Uint8Array(data.ciphertext);
    this.sharedSecret = isogenyCrypto.isogeny_decapsulate(ciphertext, secretKey);
  }
  /**
   * Post-Quantum Encrypted Fetch.
   * Encrypts the request body and decrypts the response.
   */
  async pqcfetch(endpoint, options = {}) {
    if (!this.sharedSecret || !this.sessionId) {
      throw new Error("IsogenyClient is not connected. Call handshake() first.");
    }
    let requestBody = void 0;
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ciphertext: Array.from(ciphertext),
        nonce: Array.from(nonce)
      });
    }
    const fetchOptions = {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "X-Isogeny-Session": this.sessionId
      },
      body: requestBody
    };
    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);
    if (response.status === 401) {
      console.warn("[IsogenyClient] Session expired. Automatically rotating key...");
      await this.rotate();
      return this.pqcfetch(endpoint, options);
    }
    if (!response.ok) return response;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (data.ciphertext && data.nonce) {
        const ct = new Uint8Array(data.ciphertext);
        const nonce = new Uint8Array(data.nonce);
        const decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ct);
        const decryptedStr = new TextDecoder().decode(decrypted);
        return JSON.parse(decryptedStr);
      }
      return data;
    }
    return response;
  }
  /**
   * Explicitly destroy the session on the server and clear local state.
   */
  async terminate() {
    if (!this.sessionId) return;
    try {
      await fetch(`${this.serverUrl}/api/isogeny/terminate`, {
        method: "POST",
        headers: { "X-Isogeny-Session": this.sessionId }
      });
    } catch (e) {
      console.warn("Failed to cleanly terminate Isogeny session on server");
    }
    this.sessionId = null;
    this.sharedSecret = null;
  }
  /**
   * Check if the current session is still valid on the server.
   */
  async status() {
    if (!this.sessionId) return false;
    try {
      const response = await fetch(`${this.serverUrl}/api/isogeny/status`, {
        method: "GET",
        headers: { "X-Isogeny-Session": this.sessionId }
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }
  /**
   * Force a key rotation by negotiating a new handshake.
   */
  async rotate() {
    await this.handshake();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  IsogenyClient
});
