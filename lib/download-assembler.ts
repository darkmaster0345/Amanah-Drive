/**
 * Download Assembler for decentralized file retrieval
 * Fetches shards from Blossom, decrypts via Web Worker, and assembles final file
 */

/**
 * Download Assembler for decentralized file retrieval
 * Fetches shards from Blossom, decrypts using per-chunk IVs, and assembles final file
 */

import { decryptChunkWithPrependedIV } from '@/lib/encryption';

export class DownloadAssembler {
  constructor() {
    // No worker initialization needed anymore
  }

  /**
   * Fetch a single shard from Blossom server
   */
  private async fetchShard(url: string): Promise<Uint8Array> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch shard: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('[v0] Shard fetch failed:', error);
      throw error;
    }
  }

  /**
   * Download and decrypt all shards, then assemble the final file
   */
  async downloadAndAssemble(
    shardUrls: string[],
    encryptionKey: CryptoKey,
    onProgress?: (current: number, total: number, stage: string) => void
  ): Promise<Uint8Array> {
    const totalShards = shardUrls.length;
    const decryptedShards: Uint8Array[] = [];

    console.log('[v0] Starting download assembly:', {
      totalShards,
      urls: shardUrls.length,
    });

    try {
      // Fetch and decrypt each shard sequentially
      for (let i = 0; i < totalShards; i++) {
        const url = shardUrls[i];

        // Fetch shard
        onProgress?.(i, totalShards, `Fetching shard ${i + 1}/${totalShards}`);
        const encryptedShard = await this.fetchShard(url);

        // Decrypt shard (IV is prepended to the chunk)
        onProgress?.(i + 0.5, totalShards, `Decrypting shard ${i + 1}/${totalShards}`);
        const decryptedShard = await decryptChunkWithPrependedIV(
          encryptedShard,
          encryptionKey
        );

        decryptedShards.push(decryptedShard);

        onProgress?.(i + 1, totalShards, `Shard ${i + 1}/${totalShards} complete`);

        console.log('[v0] Shard processed:', {
          shardIndex: i,
          size: decryptedShard.length,
          totalProcessed: i + 1,
        });
      }

      // Merge all shards into a single Uint8Array
      onProgress?.(totalShards, totalShards, 'Assembling file...');

      const totalSize = decryptedShards.reduce((sum, shard) => sum + shard.length, 0);
      const finalData = new Uint8Array(totalSize);

      let offset = 0;
      for (const shard of decryptedShards) {
        finalData.set(shard, offset);
        offset += shard.length;
      }

      console.log('[v0] Download assembly complete:', {
        totalShards,
        finalSize: finalData.length,
      });

      return finalData;
    } catch (error) {
      console.error('[v0] Download assembly failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup method (kept for compatibility)
   */
  cleanup(): void {
    // No worker to terminate
  }
}
