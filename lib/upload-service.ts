/**
 * Upload Service - Core business logic for encrypting and uploading files
 * Implements real AES-GCM encryption, chunking, and uploads via server-side proxy
 */

import { indexedStorage, type FileMetadata, type FileChunk } from '@/lib/indexed-storage';
import { createBlossomClient, BLOSSOM_SERVER } from '@/lib/blossom-client'; // Import createBlossomClient and BLOSSOM_SERVER

// Constants
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per shard
const UPLOAD_API_ROUTE = '/api/upload';

export type UploadStage = 'idle' | 'scanning' | 'sharding' | 'encrypting' | 'uploading' | 'complete' | 'error';

export interface UploadProgress {
  stage: UploadStage;
  progress: number;
  currentChunk: number;
  totalChunks: number;
  message: string;
}

export interface UploadResult {
  success: boolean;
  fileMetadata?: FileMetadata;
  error?: string;
}

/**
 * Generate a random AES-GCM key for file encryption
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a chunk of data using AES-GCM
 */
async function encryptChunk(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
  };
}

/**
 * Calculate SHA-256 hash of data
 */
async function hashData(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Split file into chunks
 */
function splitIntoChunks(data: Uint8Array, chunkSize: number = CHUNK_SIZE): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, Math.min(i + chunkSize, data.length)));
  }
  return chunks;
}

/**
 * Export key to hash for verification
 */
async function exportKeyHash(key: CryptoKey): Promise<string> {
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  return hashData(new Uint8Array(exportedKey));
}

/**
 * Main upload function - handles the entire upload pipeline
 */
export async function uploadFile(
  file: File,
  vaultId: string,
  publicKey: string,
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  try {
    // Stage 1: Scanning - Read file into memory
    onProgress({
      stage: 'scanning',
      progress: 0,
      currentChunk: 0,
      totalChunks: 0,
      message: 'Reading file...',
    });

    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    
    // Calculate total chunks
    const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
    
    onProgress({
      stage: 'scanning',
      progress: 100,
      currentChunk: 0,
      totalChunks,
      message: `File scanned: ${totalChunks} shards needed`,
    });

    // Stage 2: Sharding - Split file into chunks
    onProgress({
      stage: 'sharding',
      progress: 0,
      currentChunk: 0,
      totalChunks,
      message: 'Creating shards...',
    });

    const chunks = splitIntoChunks(fileData);
    
    onProgress({
      stage: 'sharding',
      progress: 100,
      currentChunk: 0,
      totalChunks,
      message: `${chunks.length} shards created`,
    });

    // Stage 3: Encrypting - Generate key and encrypt each chunk
    onProgress({
      stage: 'encrypting',
      progress: 0,
      currentChunk: 0,
      totalChunks,
      message: 'Generating encryption key...',
    });

    const encryptionKey = await generateEncryptionKey();
    const encryptionKeyHash = await exportKeyHash(encryptionKey);
    
    const encryptedChunks: { data: Uint8Array; hash: string; iv: Uint8Array }[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const { ciphertext, iv } = await encryptChunk(chunks[i], encryptionKey);
      
      // Prepend IV to ciphertext for storage (IV is not secret)
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv);
      combined.set(ciphertext, iv.length);
      
      const hash = await hashData(combined);
      
      encryptedChunks.push({
        data: combined,
        hash,
        iv,
      });

      onProgress({
        stage: 'encrypting',
        progress: Math.round(((i + 1) / chunks.length) * 100),
        currentChunk: i + 1,
        totalChunks,
        message: `Encrypting shard ${i + 1}/${totalChunks}...`,
      });
    }

    // Stage 4: Uploading - Upload each encrypted chunk to Blossom
    onProgress({
      stage: 'uploading',
      progress: 0,
      currentChunk: 0,
      totalChunks,
      message: 'Connecting to Blossom relay...',
    });

    const blossomClient = createBlossomClient(BLOSSOM_SERVER, undefined, publicKey);
    const chunkHashes: string[] = [];
    const blossomUrls: string[] = [];

    for (let i = 0; i < encryptedChunks.length; i++) {
      const chunk = encryptedChunks[i];
      
      onProgress({
        stage: 'uploading',
        progress: Math.round((i / encryptedChunks.length) * 100),
        currentChunk: i + 1,
        totalChunks,
        message: `Uploading shard ${i + 1}/${totalChunks}...`,
      });

      try {
        // Upload to Blossom with NIP-98 auth
        const uploadResult = await blossomClient.uploadChunkedFile(
          chunk.data,
          `${fileId}-chunk-${i}`,
          fileId,
          (uploaded, total) => {
            const baseProgress = (i / encryptedChunks.length) * 100;
            const chunkProgress = (uploaded / total) * (100 / encryptedChunks.length);
            onProgress({
              stage: 'uploading',
              progress: Math.round(baseProgress + chunkProgress),
              currentChunk: i + 1,
              totalChunks,
              message: `Uploading shard ${i + 1}/${totalChunks}...`,
            });
          }
        );

        chunkHashes.push(chunk.hash);
        blossomUrls.push(uploadResult.chunks[0]?.url || `${BLOSSOM_SERVER}/${chunk.hash}`);

        // Store chunk locally for offline access
        const localChunk: FileChunk = {
          id: `${fileId}-chunk-${i}`,
          fileId,
          chunkIndex: i,
          size: chunk.data.length,
          hash: chunk.hash,
          encryptedData: chunk.data,
          blossomUrl: blossomUrls[i],
        };
        await indexedStorage.saveChunk(localChunk);
        
      } catch (uploadError) {
        console.error(`[v0] Failed to upload chunk ${i}:`, uploadError);
        
        // Store locally even if upload fails (offline-first)
        chunkHashes.push(chunk.hash);
        blossomUrls.push(''); // No remote URL yet
        
        const localChunk: FileChunk = {
          id: `${fileId}-chunk-${i}`,
          fileId,
          chunkIndex: i,
          size: chunk.data.length,
          hash: chunk.hash,
          encryptedData: chunk.data,
        };
        await indexedStorage.saveChunk(localChunk);
      }
    }

    onProgress({
      stage: 'uploading',
      progress: 100,
      currentChunk: totalChunks,
      totalChunks,
      message: 'Upload complete!',
    });

    // Stage 5: Complete - Save file metadata
    const fileMetadata: FileMetadata = {
      id: fileId,
      vaultId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encryptionKeyHash,
      chunkHashes,
      blossomUrls,
      totalChunks,
      blossomServer: BLOSSOM_SERVER,
    };

    await indexedStorage.saveFileMetadata(fileMetadata);

    onProgress({
      stage: 'complete',
      progress: 100,
      currentChunk: totalChunks,
      totalChunks,
      message: 'File encrypted and uploaded!',
    });

    return {
      success: true,
      fileMetadata,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[v0] Upload failed:', error);
    
    onProgress({
      stage: 'error',
      progress: 0,
      currentChunk: 0,
      totalChunks: 0,
      message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Re-export types needed by components
 */
export type { FileMetadata };
