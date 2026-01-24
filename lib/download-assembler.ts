/**
 * Download Assembler for decentralized file retrieval
 * Fetches shards from Blossom, decrypts via Web Worker, and assembles final file
 */

interface DecryptionWorker {
  postMessage(message: any): void;
  onmessage: ((event: MessageEvent) => void) | null;
  terminate(): void;
}

export class DownloadAssembler {
  private worker: DecryptionWorker | null = null;
  private workerReady = false;

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the encryption Web Worker
   */
  private initWorker(): void {
    if (typeof window === 'undefined') return;
    try {
      this.worker = new Worker('/workers/encryption.worker.ts');
      this.workerReady = true;
    } catch (error) {
      console.error('[v0] Failed to initialize Web Worker:', error);
      this.workerReady = false;
    }
  }

  /**
   * Decrypt a single shard using Web Worker
   */
  private decryptShard(
    encryptedShard: ArrayBuffer,
    encryptionKey: CryptoKey,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Worker not initialized'));
        return;
      }

      const taskId = `decrypt-${Date.now()}-${Math.random()}`;

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === taskId) {
          this.worker?.removeEventListener('message', handleMessage);
          
          if (event.data.success) {
            resolve(new Uint8Array(event.data.result));
          } else {
            reject(new Error(event.data.error || 'Decryption failed'));
          }
        }
      };

      this.worker.addEventListener('message', handleMessage);

      this.worker.postMessage({
        id: taskId,
        type: 'decrypt',
        data: encryptedShard,
        key: encryptionKey,
        iv: iv,
      });
    });
  }

  /**
   * Fetch a single shard from Blossom server
   */
  private async fetchShard(url: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch shard: ${response.status} ${response.statusText}`);
      }
      return await response.arrayBuffer();
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
    encryptionIv: Uint8Array,
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

        // Decrypt shard via Web Worker
        onProgress?.(i + 0.5, totalShards, `Decrypting shard ${i + 1}/${totalShards}`);
        const decryptedShard = await this.decryptShard(
          encryptedShard,
          encryptionKey,
          encryptionIv
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
   * Cleanup worker
   */
  cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
    }
  }
}
