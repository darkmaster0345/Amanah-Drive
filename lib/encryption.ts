/**
 * Client-side encryption utilities for decentralized storage
 * Uses Web Crypto API for AES-GCM encryption
 */

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  tag?: string; // base64 (for authenticated encryption)
}

/**
 * Encrypt a chunk with a fresh IV prepended to the ciphertext
 * Format: [12-byte IV][ciphertext with auth tag]
 * Each chunk MUST use a unique IV for AES-GCM security
 */
export async function encryptChunkWithFreshIV(
  chunkData: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Generate fresh 12-byte IV for this chunk
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    chunkData as any
  );

  // Prepend IV to ciphertext: [12-byte IV][ciphertext]
  const result = new Uint8Array(12 + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), 12);

  return result;
}

/**
 * Decrypt a chunk that has IV prepended
 * Expects format: [12-byte IV][ciphertext with auth tag]
 */
export async function decryptChunkWithPrependedIV(
  encryptedChunk: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Extract IV (first 12 bytes)
  const iv = encryptedChunk.slice(0, 12);
  // Extract ciphertext (rest of data)
  const ciphertext = encryptedChunk.slice(12);

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext as any
  );

  return new Uint8Array(decryptedData);
}

/**
 * Derive a key from a password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

/**
 * Encrypt data using AES-GCM with a derived key
 * Handles both string and binary data
 */
export async function encryptData(
  data: string | Uint8Array,
  key: CryptoKey,
  iv?: Uint8Array
): Promise<EncryptedData> {
  let dataBuffer: Uint8Array;

  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    dataBuffer = encoder.encode(data);
  } else {
    dataBuffer = data;
  }

  if (!iv) {
    iv = crypto.getRandomValues(new Uint8Array(12));
  }

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    dataBuffer as any
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: '', // Salt is managed separately
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = Uint8Array.from(atob(encrypted.ciphertext), (c) =>
    c.charCodeAt(0)
  );
  const ivBuffer = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(str));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random keypair for Nostr identity
 */
export function generateNostrKeypair(): { publicKey: string; privateKey: string } {
  // In production, use proper Nostr key generation (secp256k1)
  // This is a placeholder using Ed25519 via Web Crypto API
  const privateKeyBuffer = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = Array.from(privateKeyBuffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // For demo purposes, use a simple hash as public key
  // Real implementation would use secp256k1
  const publicKey = Array.from(new Uint8Array(32))
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')
    .substring(0, 64);

  return { publicKey, privateKey };
}

/**
 * Generate a file encryption key using HKDF
 */
export async function generateFileKey(
  masterKey: CryptoKey,
  fileId: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const info = encoder.encode(`file-key:${fileId}`);

  // Import master key for HKDF
  const importedKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.exportKey('raw', masterKey),
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', salt: new Uint8Array(), info: info, hash: 'SHA-256' },
    importedKey,
    256
  );

  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
