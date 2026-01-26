/**
 * NIP-98 Authorization for HTTP requests
 * Used for NIP-96 compatible file upload servers
 * Supports both NIP-07 (browser extension) and direct private key signing (nostr-tools)
 */

import { finalizeEvent } from 'nostr-tools';

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: UnsignedNIP98Event): Promise<SignedNIP98Event>;
    };
  }
}

export interface UnsignedNIP98Event {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface SignedNIP98Event extends UnsignedNIP98Event {
  id: string;
  sig: string;
}

/**
 * Check if NIP-07 extension is available
 */
export function isNIP07Available(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

/**
 * Get public key from NIP-07 extension
 */
export async function getPublicKeyFromNIP07(): Promise<string> {
  if (!isNIP07Available()) {
    throw new Error('NIP-07 extension not available. Please install nos2x, Alby, or similar.');
  }
  return window.nostr!.getPublicKey();
}

/**
 * Create an unsigned NIP-98 authorization event for HTTP requests
 * CRITICAL: The 'u' tag must match the request URL EXACTLY
 */
export function createUnsignedNIP98Event(
  publicKey: string,
  url: string,
  method: string,
  kind: number = 27235,
  sha256?: string
): UnsignedNIP98Event {
  const tags = [
    ['u', url],
    ['method', method.toUpperCase()],
  ];

  // Blossom (kind 24242) requires action tag and expiration tag per BUD-02 spec
  if (kind === 24242) {
    tags.push(['t', 'upload']); // REQUIRED: Action tag for Blossom upload authorization

    // Blossom REQUIRES the sha256 of the blob in the 'x' tag for uploads
    if (sha256) {
      tags.push(['x', sha256]);
    }

    const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;
    tags.push(['expiration', oneHourFromNow.toString()]);
  }

  return {
    kind,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  };
}

/**
 * Sign a NIP-98 event using NIP-07 browser extension OR private key
 */
export async function signNIP98Event(
  event: UnsignedNIP98Event,
  privateKey?: Uint8Array
): Promise<SignedNIP98Event> {
  // Option 1: Use Private Key (if provided)
  if (privateKey) {
    // finalizeEvent computes id and sig, and returns the full signed event
    // We cast it to our SignedNIP98Event type (compatible structure)
    return finalizeEvent(event, privateKey) as any as SignedNIP98Event;
  }

  // Option 2: Use NIP-07 Extension
  if (isNIP07Available()) {
    const signedEvent = await window.nostr!.signEvent(event);
    return signedEvent;
  }

  throw new Error('No signing method available. Install NIP-07 extension or provide private key.');
}

/**
 * Generate the NIP-98 authorization header from a signed event
 * Returns the full "Nostr [base64_event]" string
 */
export function generateNIP98Header(signedEvent: SignedNIP98Event): string {
  const eventStr = JSON.stringify(signedEvent);
  const encoded = btoa(eventStr);
  return `Nostr ${encoded}`;
}

/**
 * Complete flow: Create, sign, and generate header
 * Convenience function that combines all steps
 */
export async function createAuthHeader(
  publicKey: string,
  url: string,
  method: string,
  privateKey?: Uint8Array,
  kind: number = 27235,
  sha256?: string
): Promise<string> {
  const unsignedEvent = createUnsignedNIP98Event(publicKey, url, method, kind, sha256);
  const signedEvent = await signNIP98Event(unsignedEvent, privateKey);
  return generateNIP98Header(signedEvent);
}

// Legacy exports for backwards compatibility
export type NIP98Event = SignedNIP98Event;
export const createNIP98Event = createUnsignedNIP98Event;
