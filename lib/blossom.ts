/**
 * Blossom protocol client for decentralized blob storage
 * Handles encrypted file uploads and downloads
 * All files must be encrypted before touching the server
 */

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

/**
 * Blossom Protocol Client
 * Manages encrypted blob uploads and downloads
 */
export class BlossomClient {
  private serverUrl: string;
  private authToken?: string;

  constructor(serverUrl: string, authToken?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = authToken;
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
        method: 'POST',
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
}

/**
 * Factory for creating Blossom client instances
 */
export function createBlossomClient(
  serverUrl: string = 'https://cdn.example.com',
  authToken?: string
): BlossomClient {
  return new BlossomClient(serverUrl, authToken);
}
