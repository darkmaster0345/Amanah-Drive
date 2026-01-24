'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileIcon, Lock, Trash2, Download, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/lib/toast'
import { type FileMetadata } from '@/lib/indexed-storage'
import { deriveKeyFromPassword } from '@/lib/encryption'
import { DownloadAssembler } from '@/lib/download-assembler'

interface FileViewerProps {
  files: FileMetadata[]
  selectedFile: FileMetadata | null
  onSelectFile: (file: FileMetadata) => void
  onDeleteFile: (fileId: string) => void
  vaultName: string
  publicKey: string
}

export function FileViewer({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  vaultName,
  publicKey,
}: FileViewerProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async (file: FileMetadata) => {
    let assembler: DownloadAssembler | null = null;

    try {
      setDownloadingFileId(file.id)
      setDownloadProgress(0)

      // Validate file has shard URLs
      if (!file.blossomUrls || file.blossomUrls.length === 0) {
        toast.error('File not found', {
          description: 'No download URLs available for this file.',
        })
        setDownloadingFileId(null)
        return
      }

      setDownloadProgress(5)

      // Derive encryption key from password
      const password = localStorage.getItem('vault_nostr_pubkey') || publicKey
      const { key, salt } = await deriveKeyFromPassword(password)

      setDownloadProgress(10)

      // Initialize download assembler
      assembler = new DownloadAssembler()

      // Create IV from encryption key hash (deterministic for this file)
      const ivBuffer = new Uint8Array(12)
      const keyHashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.encryptionKeyHash))
      const keyHashArray = new Uint8Array(keyHashBytes)
      for (let i = 0; i < 12; i++) {
        ivBuffer[i] = keyHashArray[i]
      }

      console.log('[v0] Starting download:', {
        fileName: file.name,
        shardCount: file.blossomUrls.length,
        fileSize: file.size,
      })

      // Download and decrypt all shards
      const finalData = await assembler.downloadAndAssemble(
        file.blossomUrls,
        key,
        ivBuffer,
        (current, total, stage) => {
          // Map shard progress (0 to totalShards) to 10-85%
          const progressPercent = 10 + (current / total) * 75
          setDownloadProgress(Math.floor(progressPercent))
          
          console.log('[v0] Download progress:', {
            stage,
            current,
            total,
            percent: Math.floor(progressPercent),
          })
        }
      )

      setDownloadProgress(90)

      // Create blob and trigger download
      const blob = new Blob([finalData], { type: file.mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setDownloadProgress(100)

      toast.success(`Downloaded "${file.name}"`, {
        description: `${file.blossomUrls.length} shards decrypted and assembled`,
      })

      console.log('[v0] Download complete:', {
        fileName: file.name,
        finalSize: finalData.length,
        shardCount: file.blossomUrls.length,
      })

      // Auto-reset after completion
      setTimeout(() => {
        setDownloadingFileId(null)
        setDownloadProgress(0)
      }, 1500)
    } catch (error) {
      console.error('[v0] File download failed:', error)
      toast.error('Failed to download file', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
      setDownloadingFileId(null)
      setDownloadProgress(0)
    } finally {
      // Cleanup worker
      assembler?.cleanup()
    }
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-5 md:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">{vaultName}</h2>
        <p className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''} stored securely
        </p>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <FileIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-muted-foreground">
              No files in this vault yet. Upload one to get started!
            </p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max flex-1">
          {files.map((file) => (
            <Card
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={`p-4 sm:p-5 cursor-pointer transition-all hover:shadow-md ${
                selectedFile?.id === file.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-secondary/30'
              }`}
            >
              <div className="space-y-3">
                {/* File Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg flex-shrink-0 h-10 w-10 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={downloadingFileId !== null}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(file)
                      }}
                      title="Download and decrypt file"
                      className="h-8 w-8 p-0"
                    >
                      {downloadingFileId === file.id ? (
                        <CheckCircle className="w-4 h-4 text-accent animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(file.id)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* File Info */}
                <div className="space-y-2 min-h-[60px]">
                  <div className="flex items-start gap-2">
                    <p className="font-semibold text-sm text-foreground flex-1 text-pretty line-clamp-2">
                      {file.name}
                    </p>
                    <Lock className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="text-right">
                        {formatDistanceToNow(file.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] break-all opacity-75">
                      {file.encryptionKeyHash.substring(0, 12)}...
                    </p>
                  </div>
                </div>

                {/* Download Progress */}
                {downloadingFileId === file.id && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-accent">Downloading</span>
                        <span className="text-xs font-mono text-muted-foreground">{downloadProgress}%</span>
                      </div>
                      <Progress value={downloadProgress} className="h-2" />
                    </div>
                    {downloadProgress === 100 && (
                      <p className="text-xs text-accent font-medium">✓ Download complete</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete File?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The encrypted file will be permanently deleted
            from your vault.
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDeleteFile(deleteConfirm)
                  setDeleteConfirm(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
