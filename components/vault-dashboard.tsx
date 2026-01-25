'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { toast } from '@/lib/toast'
import { indexedStorage, type FileMetadata, type Vault } from '@/lib/indexed-storage'
import { deriveKeyFromPassword } from '@/lib/encryption'
import { createBlossomClient } from '@/lib/blossom'
import { AmanahDashboard } from '@/components/amanah-dashboard'

interface VaultDashboardProps {
  publicKey: string
  onLogout: () => void
}

export function VaultDashboard({ publicKey, onLogout }: VaultDashboardProps) {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadVaults()
  }, [])

  useEffect(() => {
    if (selectedVault) {
      loadFiles(selectedVault.id)
    }
  }, [selectedVault])

  const loadVaults = async () => {
    try {
      setIsLoading(true)
      const loadedVaults = await indexedStorage.getVaults()
      setVaults(loadedVaults)

      if (loadedVaults.length === 0) {
        // Create default vault
        const defaultVault: Vault = {
          id: 'default-' + Date.now(),
          name: 'My Vault',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          publicKey,
        }
        await indexedStorage.saveVault(defaultVault)
        setVaults([defaultVault])
        setSelectedVault(defaultVault)
      } else {
        setSelectedVault(loadedVaults[0])
      }
    } catch (error) {
      toast.error('Failed to load vaults')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFiles = async (vaultId: string) => {
    try {
      const loadedFiles = await indexedStorage.getVaultFiles(vaultId)
      setFiles(loadedFiles)
      setSelectedFile(null)
    } catch (error) {
      toast.error('Failed to load files')
    }
  }

  const handleCreateVault = async () => {
    const vaultName = prompt('Enter vault name:')
    if (!vaultName) return

    try {
      const newVault: Vault = {
        id: 'vault-' + Date.now(),
        name: vaultName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        publicKey,
      }
      await indexedStorage.saveVault(newVault)
      setVaults([...vaults, newVault])
      toast.success('Vault created successfully')
    } catch (error) {
      toast.error('Failed to create vault')
    }
  }

  const handleFileUploaded = (file: FileMetadata) => {
    setFiles([...files, file])
    toast.success(`File "${file.name}" encrypted & uploaded`)
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      await indexedStorage.deleteFile(fileId)
      setFiles(files.filter((f) => f.id !== fileId))
      setSelectedFile(null)
      toast.success('File deleted')
    } catch (error) {
      toast.error('Failed to delete file')
    }
  }

  const handleDeleteVault = async (vaultId: string) => {
    try {
      await indexedStorage.deleteVaultWithFiles(vaultId)
      const updatedVaults = vaults.filter(v => v.id !== vaultId)
      setVaults(updatedVaults)

      if (updatedVaults.length > 0) {
        setSelectedVault(updatedVaults[0])
      } else {
        setSelectedVault(null)
      }

      toast.success('Vault deleted')
    } catch (error) {
      toast.error('Failed to delete vault')
    }
  }

  const handleDownloadFile = async (file: FileMetadata) => {
    try {
      toast.info(`Downloading ${file.name}...`);

      // 1. Derive key
      const password = localStorage.getItem('vault_nostr_pubkey') || publicKey;
      const { key } = await deriveKeyFromPassword(password);

      // 2. Initialize Blossom Client
      const blossomClient = createBlossomClient('https://nostr.build/api/v2/upload/blossom', undefined, publicKey);

      // 3. Download and Decrypt
      const fileData = await blossomClient.downloadChunkedFile(
        file.blossomUrls,
        key,
        (current: number, total: number) => {
          const progress = Math.floor((current / total) * 100);
          console.log(`[Amanah] Download progress: ${progress}%`);
        }
      );

      // 4. Trigger browser download
      const blob = new Blob([fileData as any], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${file.name} downloaded successfully`);
    } catch (error) {
      console.error('[Amanah] Download failed:', error);
      toast.error('Download failed');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center gold-glow">
            <Shield className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your sovereign vault...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AmanahDashboard
      publicKey={publicKey}
      files={files}
      vaults={vaults}
      selectedVault={selectedVault}
      onSelectVault={setSelectedVault}
      onFileUpload={handleFileUploaded}
      onSelectFile={setSelectedFile}
      onDownloadFile={handleDownloadFile}
      onDeleteFile={handleDeleteFile}
      onDeleteVault={handleDeleteVault}
      onCreateVault={handleCreateVault}
      onLogout={onLogout}
    />
  )
}
