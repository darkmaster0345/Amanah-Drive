/**
 * Blossom protocol client for decentralized blob storage
 * Handles encrypted file uploads and downloads
 * All files must be encrypted before touching the server
 * Implements NIP-96 POST method for reliable uploads
 */

import { createAuthHeader } from '@/lib/nip-98-auth';
import { createBUD02Event, generateAuthHeader } from '@/lib/bud-02-auth'; // Import createBUD02Event and generateAuthHeader
import { encryptChunkWithFreshIV, decryptChunkWithPrependedIV } from '@/lib/encryption';

export interface BlossomServerInfo {
  url: string;
  name: string;
  supported_nips: number[];
  max_size: number;
  pubkey: string;
}

export interface UploadResponse {
  url: string;
  sha256: string;
  size: number;
}

export interface BlobMetadata {
  sha256: string;
  size: number;
  type: string;
  url: string;
  timestamp: number;
}

export interface ChunkUploadResponse {
  chunkIndex: number;
  hash: string;
  size: number;
  url: string;
}

export interface MultiChunkUploadResult {
  fileId: string;
  totalChunks: number;
  chunks: ChunkUploadResponse[];
  totalSize: number;
}

/**
 * Blossom Protocol Client
 * Manages encrypted blob uploads and downloads
 */
export class BlossomClient {
  private serverUrl: string;
  private authToken?: string;
  private publicKey?: string;

  constructor(
    serverUrl: string = 'https://satellite.earth',
    authToken?: string,
    publicKey?: string
  ) {
    this.serverUrl = serverUrl;
    this.authToken = authToken;
    this.publicKey = publicKey || localStorage.getItem('vault_nostr_pubkey') || undefined;
  }

  /**
   * Get server information and capabilities
   */
  async getServerInfo(): Promise<BlossomServerInfo> {
    try {
      const response = await fetch(`${this.serverUrl}/.well-known/blossom.json`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[v0] Failed to get Blossom server info:', error);
      throw error;
    }
  }

  /**
   * Upload encrypted blob to server
   * The blob must be encrypted client-side BEFORE calling this method
   */
  async uploadBlob(
    encryptedData: Uint8Array,
    fileName: string,
    encryptionKeyHash: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    const blob = new Blob([encryptedData as any], { type: 'application/octet-stream' });
    formData.append('file', blob, fileName);
    formData.append('encryption_key_hash', encryptionKeyHash);

    try {
      const headers: HeadersInit = {
        'X-Blossom-Auth': this.authToken || '',
      };

      const response = await fetch(`${this.serverUrl}/upload`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[v0] Blob uploaded successfully:', {
        sha256: data.sha256.substring(0, 8) + '...',
        size: data.size,
      });

      return {
        url: data.url || `${this.serverUrl}/file/${data.sha256}`,
        sha256: data.sha256,
        size: data.size,
      };
    } catch (error) {
      console.error('[v0] Blob upload failed:', error);
      throw error;
    }
  }

  /**
   * Download encrypted blob from server
   * Returns encrypted data; decryption must happen client-side
   */
  async downloadBlob(blobUrl: string): Promise<Uint8Array> {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('[v0] Blob downloaded:', {
        size: arrayBuffer.byteLength,
      });

      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('[v0] Blob download failed:', error);
      throw error;
    }
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(sha256: string): Promise<BlobMetadata | null> {
    try {
      const response = await fetch(`${this.serverUrl}/blob/${sha256}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get metadata: ${response.status}`);
      }

      const data = await response.json();
      return {
        sha256: data.sha256,
        size: data.size,
        type: data.type || 'application/octet-stream',
        url: data.url || `${this.serverUrl}/file/${sha256}`,
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('[v0] Failed to get blob metadata:', error);
      return null;
    }
  }

  /**
   * Delete blob from server
   */
  async deleteBlob(sha256: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/blob/${sha256}`, {
        method: 'DELETE',
        headers: {
          'X-Blossom-Auth': this.authToken || '',
        },
      });

      if (response.ok) {
        console.log('[v0] Blob deleted:', sha256.substring(0, 8) + '...');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[v0] Failed to delete blob:', error);
      return false;
    }
  }

  /**
   * List blobs on server (if supported)
   */
  async listBlobs(limit: number = 100): Promise<BlobMetadata[]> {
    try {
      const response = await fetch(`${this.serverUrl}/blobs?limit=${limit}`, {
        headers: {
          'X-Blossom-Auth': this.authToken || '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list blobs: ${response.status}`);
      }

      const data = await response.json();
      return data.blobs || [];
    } catch (error) {
      console.error('[v0] Failed to list blobs:', error);
      return [];
    }
  }

  /**
   * Calculate SHA-256 hash of data for verification
   */
  async hashData(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async uploadChunkedFile(
    fileData: Uint8Array,
    fileName: string,
    fileId: string,
    encryptionKey: CryptoKey,
    privateKey?: Uint8Array,
    onChunkProgress?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<MultiChunkUploadResult> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (Standard for most servers)
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
    const chunks: ChunkUploadResponse[] = [];

    // CRITICAL: We strictly target the official Blossom subdomain
    // Target the upload endpoint on the configured server
    const UPLOAD_SERVER = `${this.serverUrl}/upload`;

    // Validate public key early
    if (!this.publicKey) {
      throw new Error('Public key required for NIP-98 authorization. Please login with Nostr.');
    }

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileData.length);
        const chunkPlaintext = fileData.slice(start, end);

        // 1. Encrypt chunk with FRESH IV (prepended to result)
        // Format: [12-byte IV][ciphertext]
        const encryptedChunk = await encryptChunkWithFreshIV(chunkPlaintext, encryptionKey);

        // 2. Compute hash of the ENCRYPTED content (this is what the server identifies)
        const chunkHash = await this.hashData(encryptedChunk);

        console.log('[v0] Uploading chunk:', {
          chunkIndex: i,
          totalChunks,
          hash: chunkHash.substring(0, 8) + '...',
          size: encryptedChunk.byteLength,
        });

        // 3. Generate Blossom Auth Header (kind 24242)
        // CRITICAL: The URL in the 'u' tag must match the endpoint EXACTLY
        const authHeader = await createAuthHeader(this.publicKey, UPLOAD_SERVER, 'PUT', privateKey, 24242, chunkHash);

        // 4. Prepare FormData
        const formData = new FormData();
        // File must be the LAST field for some servers, but standard says order shouldn't matter.
        // NIP-96 says 'file' field.
        const blob = new Blob([encryptedChunk as any], { type: 'application/octet-stream' });
        formData.append('file', blob, 'blob'); // Filename 'blob' is common for chunks

        // 5. Upload
        try {
          const response = await fetch(UPLOAD_SERVER, {
            method: 'PUT',
            headers: {
              'Authorization': authHeader,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
          }

          const responseData = await response.json();

          console.log('[v0] Chunk uploaded successfully:', {
            server: UPLOAD_SERVER,
            status: response.status,
            hash: chunkHash.substring(0, 8) + '...',
          });

          // Store successful chunk info
          const downloadUrl = responseData.url || `${this.serverUrl}/${chunkHash}`;

          chunks.push({
            chunkIndex: i,
            hash: chunkHash,
            size: encryptedChunk.byteLength,
            url: downloadUrl,
          });

          onChunkProgress?.(i + 1, totalChunks);

          // Small yield to keep UI responsive
          await new Promise(r => setTimeout(r, 0));

        } catch (error) {
          console.error('[v0] Chunk upload error:', error);
          throw error;
        }
      }

      return {
        fileId,
        totalChunks,
        chunks,
        totalSize: fileData.length,
      };
    } catch (error) {
      console.error('[v0] Chunked upload failed:', error);
      throw error;
    }
  }

  /**
   * Download file chunks from Blossom and reconstruct
   */
  async downloadChunkedFile(
    chunkUrls: string[],
    encryptionKey: CryptoKey,
    onChunkDownload?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<Uint8Array> {
    try {
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < chunkUrls.length; i++) {
        // 1. Download encrypted chunk
        const encryptedChunk = await this.downloadBlob(chunkUrls[i]);

        // 2. Decrypt using prepended IV
        const decryptedChunk = await decryptChunkWithPrependedIV(encryptedChunk, encryptionKey);

        chunks.push(decryptedChunk);

        onChunkDownload?.(i + 1, chunkUrls.length);

        console.log('[v0] Chunk downloaded and decrypted:', {
          chunkIndex: i,
          totalChunks: chunkUrls.length,
          size: decryptedChunk.length,
        });
      }

      // Concatenate all chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (error) {
      console.error('[v0] Chunked download failed:', error);
      throw error;
    }
  }
}

/**
 * Factory for creating Blossom client instances with BUD-02 support
 */
export function createBlossomClient(
  serverUrl: string = 'https://blossom.primal.net',
  authToken?: string,
  publicKey?: string
): BlossomClient {
  return new BlossomClient(serverUrl, authToken, publicKey);
}
