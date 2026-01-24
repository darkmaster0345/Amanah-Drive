/**
 * NIP-98 Authorization for HTTP requests
 * Used for NIP-96 compatible file upload servers
 */

export interface NIP98Event {
  kind: 27235;
  pubkey: string;
  created_at: number;
  tags: Array<['u' | 'method', string]>;
  content: string;
  sig: string;
}

/**
 * Create a NIP-98 authorization event for HTTP requests
 * Used with NIP-96 file upload endpoints
 */
export function createNIP98Event(
  publicKey: string,
  url: string,
  method: string
): NIP98Event {
  const event: Omit<NIP98Event, 'sig'> = {
    kind: 27235,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['u', url],
      ['method', method],
    ],
    content: '',
  };

  // Placeholder signature (256-char hex string)
  const sig = Array(128).fill('0').join('');

  return {
    ...event,
    sig,
  } as NIP98Event;
}

/**
 * Generate the NIP-98 authorization header
 * Returns the full "Nostr [base64_event]" string
 */
export function generateNIP98Header(event: NIP98Event): string {
  const eventStr = JSON.stringify(event);
  const encoded = btoa(eventStr);
  return `Nostr ${encoded}`;
}
