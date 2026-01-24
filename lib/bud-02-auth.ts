/**
 * BUD-02 Authorization for Blossom
 * Implements the Blossom Upload Delegation specification
 */

export interface BUD02Event {
  kind: 24242;
  pubkey: string;
  created_at: number;
  tags: [['t', 'upload'], ['x', string], ...string[][]];
  content: string;
  sig: string;
}

/**
 * Create a BUD-02 authorization event for file uploads
 * This follows the Blossom Upload Delegation spec
 */
export function createBUD02Event(
  publicKey: string,
  fileHash: string,
  nsec: string
): BUD02Event {
  const event: Omit<BUD02Event, 'id' | 'sig'> = {
    kind: 24242,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['t', 'upload'],
      ['x', fileHash],
    ],
    content: `Authorizing upload of file ${fileHash.substring(0, 8)}...`,
  };

  // In a real implementation, sign with the private key
  // For now, return as-is (signing would happen in the component)
  return event as BUD02Event;
}

/**
 * Generate the Nostr authorization header for BUD-02
 */
export function generateAuthHeader(event: BUD02Event): string {
  // Base64 encode the stringified event
  const eventStr = JSON.stringify(event);
  const encoded = btoa(eventStr);
  return `Nostr ${encoded}`;
}

/**
 * Parse nsec to extract public key (simplified)
 * In production, use a proper Nostr library
 */
export function extractPublicKeyFromNsec(nsec: string): string {
  // This is a placeholder - in production you'd use proper key derivation
  // For now, we'll store the public key in localStorage during auth setup
  return localStorage.getItem('vault_nostr_pubkey') || '';
}
