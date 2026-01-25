/**
 * IndexedDB storage layer for Vault
 * Provides persistent, queryable storage for file metadata and chunks
 * This is the "Amanah" (reliable) way to handle large file collections
 */

export interface FileMetadata {
  id: string;
  vaultId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  encryptionKeyHash: string;
  chunkHashes: string[];
  blossomUrls: string[];
  totalChunks?: number;
}

export interface FileChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  size: number;
  hash: string;
  encryptedData: Uint8Array;
  blossomUrl?: string;
}

export interface Vault {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  publicKey: string;
}

const DB_NAME = 'VaultStorage';
const DB_VERSION = 1;

class IndexedStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Vaults object store
        if (!db.objectStoreNames.contains('vaults')) {
          const vaultStore = db.createObjectStore('vaults', { keyPath: 'id' });
          vaultStore.createIndex('publicKey', 'publicKey', { unique: false });
        }

        // File metadata object store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('vaultId', 'vaultId', { unique: false });
          fileStore.createIndex('name', 'name', { unique: false });
          fileStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // File chunks object store
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
          chunkStore.createIndex('fileId', 'fileId', { unique: false });
          chunkStore.createIndex('hash', 'hash', { unique: true });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Store file metadata
   */
  async saveFileMetadata(file: FileMetadata): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['files'], 'readwrite');
    const store = tx.objectStore('files');

    return new Promise((resolve, reject) => {
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a file chunk
   */
  async saveChunk(chunk: FileChunk): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['chunks'], 'readwrite');
    const store = tx.objectStore('chunks');

    return new Promise((resolve, reject) => {
      const request = store.put(chunk);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');

    return new Promise((resolve, reject) => {
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all files in a vault
   */
  async getVaultFiles(vaultId: string): Promise<FileMetadata[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['files'], 'readonly');
    const store = tx.objectStore('files');
    const index = store.index('vaultId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(vaultId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get file chunks by file ID
   */
  async getFileChunks(fileId: string): Promise<FileChunk[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['chunks'], 'readonly');
    const store = tx.objectStore('chunks');
    const index = store.index('fileId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(fileId);
      request.onsuccess = () => {
        const chunks = request.result as FileChunk[];
        resolve(chunks.sort((a, b) => a.chunkIndex - b.chunkIndex));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete file and its chunks
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['files', 'chunks'], 'readwrite');

    return new Promise((resolve, reject) => {
      // Delete file metadata
      const fileStore = tx.objectStore('files');
      fileStore.delete(fileId);

      // Delete all chunks
      const chunkStore = tx.objectStore('chunks');
      const index = chunkStore.index('fileId');
      const request = index.openCursor(fileId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Save vault
   */
  async saveVault(vault: Vault): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['vaults'], 'readwrite');
    const store = tx.objectStore('vaults');

    return new Promise((resolve, reject) => {
      const request = store.put(vault);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete vault and all its files
   */
  async deleteVaultWithFiles(vaultId: string): Promise<void> {
    await this.init();
    const files = await this.getVaultFiles(vaultId);

    // Delete all files first
    await Promise.all(files.map(file => this.deleteFile(file.id)));

    // Delete vault record
    const tx = this.db!.transaction(['vaults'], 'readwrite');
    const store = tx.objectStore('vaults');

    return new Promise((resolve, reject) => {
      const request = store.delete(vaultId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all vaults
   */
  async getVaults(): Promise<Vault[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['vaults'], 'readonly');
    const store = tx.objectStore('vaults');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for logout)
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(['vaults', 'files', 'chunks'], 'readwrite');

    return new Promise((resolve, reject) => {
      tx.objectStore('vaults').clear();
      tx.objectStore('files').clear();
      tx.objectStore('chunks').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Export singleton instance
export const indexedStorage = new IndexedStorage();
