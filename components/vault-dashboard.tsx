'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileUploadArea } from '@/components/file-upload-area'
import { VaultList } from '@/components/vault-list'
import { FileViewer } from '@/components/file-viewer'
import { Dashboard } from '@/components/dashboard'
import { PrivacyStatusBar } from '@/components/privacy-status-bar'
import { LogOut, Lock, Plus } from 'lucide-react'
import { toast } from '@/lib/toast'
import { indexedStorage, type FileMetadata, type Vault } from '@/lib/indexed-storage'

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
      console.error('[v0] Failed to load vaults:', error)
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
      console.error('[v0] Failed to load files:', error)
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
      console.error('[v0] Failed to create vault:', error)
      toast.error('Failed to create vault')
    }
  }

  const handleFileUploaded = (file: FileMetadata) => {
    setFiles([...files, file])
    toast.success(`File "${file.name}" uploaded and encrypted`)
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      await indexedStorage.deleteFile(fileId)
      setFiles(files.filter((f) => f.id !== fileId))
      setSelectedFile(null)
      toast.success('File deleted')
    } catch (error) {
      console.error('[v0] Failed to delete file:', error)
      toast.error('Failed to delete file')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading vault...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Privacy & Relay Status Bar */}
      <PrivacyStatusBar publicKey={publicKey} />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Vault</h1>
              <p className="text-xs text-muted-foreground">
                {publicKey.substring(0, 8)}...
              </p>
            </div>
          </div>

          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
          {/* Sidebar - Vaults */}
          <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/30 overflow-y-auto">
            <div className="p-4 sm:p-5 md:p-6 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-foreground">Vaults</h2>
                <Button
                  onClick={handleCreateVault}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <VaultList
                vaults={vaults}
                selectedVault={selectedVault}
                onSelectVault={setSelectedVault}
              />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
              <Tabs defaultValue="files" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent
                    value="files"
                    className="h-full m-0 overflow-y-auto"
                  >
                    <FileViewer
                      files={files}
                      selectedFile={selectedFile}
                      onSelectFile={setSelectedFile}
                      onDeleteFile={handleDeleteFile}
                      vaultName={selectedVault?.name || 'Unknown'}
                      publicKey={publicKey}
                    />
                  </TabsContent>

                  <TabsContent
                    value="upload"
                    className="h-full m-0 overflow-y-auto"
                  >
                    {selectedVault ? (
                      <div className="p-4 md:p-8">
                        <FileUploadArea
                          vaultId={selectedVault.id}
                          publicKey={publicKey}
                          onFileUploaded={handleFileUploaded}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Card className="p-8 text-center">
                          <p className="text-muted-foreground">
                            Please select or create a vault first
                          </p>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="stats"
                    className="h-full m-0 overflow-y-auto"
                  >
                    <Dashboard
                      files={files}
                      vaults={vaults}
                      publicKey={publicKey}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
