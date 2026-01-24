/**
 * Blossom protocol client for decentralized blob storage
 * Handles encrypted file uploads and downloads
 * All files must be encrypted before touching the server
 * Implements BUD-02 Authorization spec
 */

import { createBUD02Event, generateAuthHeader } from '@/lib/bud-02-auth';

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
    const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
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
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async uploadChunkedFile(
    encryptedData: Uint8Array,
    fileName: string,
    fileId: string,
    onChunkProgress?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<MultiChunkUploadResult> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(encryptedData.length / CHUNK_SIZE);
    const chunks: ChunkUploadResponse[] = [];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedData.length);
        const chunkData = encryptedData.slice(start, end);

        // Compute SHA-256 hash of the chunk
        const chunkHash = await this.hashData(chunkData);

        // Validate public key
        if (!this.publicKey) {
          throw new Error('Public key required for BUD-02 authorization');
        }

        // Create BUD-02 event with correct structure
        const bud02Event = createBUD02Event(this.publicKey, chunkHash, '');
        const authHeader = generateAuthHeader(bud02Event);

        console.log('[v0] Uploading chunk:', {
          chunkIndex: i,
          totalChunks,
          hash: chunkHash.substring(0, 8) + '...',
          size: chunkData.byteLength,
          server: this.serverUrl,
        });

        // Try hash-addressed route first, then API fallback
        const uploadUrls = [
          `${this.serverUrl}/${chunkHash}`, // Hash-addressed route: satellite.earth/[hex-hash]
          'https://api.satellite.earth/v1/media', // API fallback
        ];

        let uploadSuccess = false;
        let uploadError: Error | null = null;

        for (const uploadUrl of uploadUrls) {
          try {
            console.log('[v0] Attempting upload to:', uploadUrl);

            const response = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Authorization': authHeader,
              },
              body: chunkData,
              mode: 'cors',
              credentials: 'omit',
            });

            if (response.status >= 200 && response.status < 300) {
              // Success
              console.log('[v0] Chunk uploaded successfully to:', uploadUrl);

              chunks.push({
                chunkIndex: i,
                hash: chunkHash,
                size: chunkData.byteLength,
                url: `${this.serverUrl}/${chunkHash}`,
              });

              onChunkProgress?.(i + 1, totalChunks);
              uploadSuccess = true;
              break;
            } else {
              // Log error details for this URL
              const errorText = await response.text();
              console.warn('[v0] Upload failed for', uploadUrl, ':', {
                status: response.status,
                statusText: response.statusText,
                errorDetails: errorText.substring(0, 200),
              });
              uploadError = new Error(
                `${uploadUrl}: ${response.status} ${response.statusText}`
              );
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.warn('[v0] Upload error for', uploadUrl, ':', errorMsg);
            uploadError = error instanceof Error ? error : new Error(errorMsg);
          }
        }

        if (!uploadSuccess) {
          console.error('[v0] Upload failed on all endpoints:', uploadError?.message);
          throw uploadError || new Error('Upload failed on all endpoints');
        }
      }

      return {
        fileId,
        totalChunks,
        chunks,
        totalSize: encryptedData.length,
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
    onChunkDownload?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<Uint8Array> {
    try {
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < chunkUrls.length; i++) {
        const chunkData = await this.downloadBlob(chunkUrls[i]);
        chunks.push(chunkData);

        onChunkDownload?.(i + 1, chunkUrls.length);

        console.log('[v0] Chunk downloaded:', {
          chunkIndex: i,
          totalChunks: chunkUrls.length,
          size: chunkData.length,
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
