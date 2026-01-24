/**
 * SQLite WASM + OPFS database layer for local-first storage
 * Provides typed database operations with encryption metadata management
 */

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  encryptionKeyHash: string;
  blossomUrl?: string;
  nostrEventId?: string;
  createdAt: number;
  updatedAt: number;
  vaultId: string;
}

export interface Vault {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface AccessPermission {
  id: string;
  fileId: string;
  grantedTo: string; // Nostr public key
  accessLevel: 'read' | 'read-write';
  expiresAt?: number;
  createdAt: number;
}

export interface SyncMetadata {
  fileId: string;
  lastBlossomSync?: number;
  lastNostrSync?: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

/**
 * Database manager for SQLite WASM
 * Currently uses in-memory storage, but ready for SQLite WASM integration
 */
export class LocalStorageDB {
  private files: Map<string, StorageFile> = new Map();
  private vaults: Map<string, Vault> = new Map();
  private permissions: Map<string, AccessPermission[]> = new Map();
  private syncMetadata: Map<string, SyncMetadata> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  // File operations
  async addFile(file: StorageFile): Promise<void> {
    this.files.set(file.id, file);
    await this.saveToLocalStorage();
  }

  async getFile(id: string): Promise<StorageFile | undefined> {
    return this.files.get(id);
  }

  async getFilesByVault(vaultId: string): Promise<StorageFile[]> {
    return Array.from(this.files.values()).filter((f) => f.vaultId === vaultId);
  }

  async updateFile(file: StorageFile): Promise<void> {
    this.files.set(file.id, file);
    await this.saveToLocalStorage();
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
    this.permissions.delete(id);
    this.syncMetadata.delete(id);
    await this.saveToLocalStorage();
  }

  async listFiles(): Promise<StorageFile[]> {
    return Array.from(this.files.values());
  }

  // Vault operations
  async addVault(vault: Vault): Promise<void> {
    this.vaults.set(vault.id, vault);
    await this.saveToLocalStorage();
  }

  async getVault(id: string): Promise<Vault | undefined> {
    return this.vaults.get(id);
  }

  async updateVault(vault: Vault): Promise<void> {
    this.vaults.set(vault.id, vault);
    await this.saveToLocalStorage();
  }

  async deleteVault(id: string): Promise<void> {
    // Delete associated files
    const filesToDelete = Array.from(this.files.values())
      .filter((f) => f.vaultId === id)
      .map((f) => f.id);

    for (const fileId of filesToDelete) {
      await this.deleteFile(fileId);
    }

    this.vaults.delete(id);
    await this.saveToLocalStorage();
  }

  async listVaults(): Promise<Vault[]> {
    return Array.from(this.vaults.values());
  }

  // Permission operations
  async grantPermission(permission: AccessPermission): Promise<void> {
    const permissions = this.permissions.get(permission.fileId) || [];
    permissions.push(permission);
    this.permissions.set(permission.fileId, permissions);
    await this.saveToLocalStorage();
  }

  async getPermissions(fileId: string): Promise<AccessPermission[]> {
    return this.permissions.get(fileId) || [];
  }

  async revokePermission(fileId: string, grantedTo: string): Promise<void> {
    const permissions = this.permissions.get(fileId) || [];
    this.permissions.set(
      fileId,
      permissions.filter((p) => p.grantedTo !== grantedTo)
    );
    await this.saveToLocalStorage();
  }

  // Sync metadata operations
  async updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
    this.syncMetadata.set(metadata.fileId, metadata);
    await this.saveToLocalStorage();
  }

  async getSyncMetadata(fileId: string): Promise<SyncMetadata | undefined> {
    return this.syncMetadata.get(fileId);
  }

  // Persistence
  private async saveToLocalStorage(): Promise<void> {
    try {
      const data = {
        files: Array.from(this.files.entries()),
        vaults: Array.from(this.vaults.entries()),
        permissions: Array.from(this.permissions.entries()),
        syncMetadata: Array.from(this.syncMetadata.entries()),
      };
      localStorage.setItem('vault_db', JSON.stringify(data));
    } catch (error) {
      console.error('[v0] Failed to save database:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('vault_db');
      if (!data) return;

      const parsed = JSON.parse(data);
      this.files = new Map(parsed.files || []);
      this.vaults = new Map(parsed.vaults || []);
      this.permissions = new Map(parsed.permissions || []);
      this.syncMetadata = new Map(parsed.syncMetadata || []);
    } catch (error) {
      console.error('[v0] Failed to load database:', error);
    }
  }

  // Statistics
  async getTotalSize(): Promise<number> {
    return Array.from(this.files.values()).reduce((sum, f) => sum + f.size, 0);
  }

  async getFileCount(): Promise<number> {
    return this.files.size;
  }

  async getVaultCount(): Promise<number> {
    return this.vaults.size;
  }
}

export const db = new LocalStorageDB();
