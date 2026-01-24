'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileIcon, Lock, Trash2, Download } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { StorageFile } from '@/lib/db'

interface FileViewerProps {
  files: StorageFile[]
  selectedFile: StorageFile | null
  onSelectFile: (file: StorageFile) => void
  onDeleteFile: (fileId: string) => void
  vaultName: string
}

export function FileViewer({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  vaultName,
}: FileViewerProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-1">{vaultName}</h2>
        <p className="text-sm text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''} stored securely
        </p>
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-12 text-center">
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
        <div className="grid grid-cols-1 gap-4 flex-1">
          {files.map((file) => (
            <Card
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={`p-4 cursor-pointer transition-colors ${
                selectedFile?.id === file.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 h-10 w-10 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground truncate">
                        {file.name}
                      </p>
                      <Lock className="w-4 h-4 text-accent flex-shrink-0" />
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>
                        Uploaded{' '}
                        {formatDistanceToNow(file.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 font-mono break-all">
                      Key: {file.encryptionKeyHash.substring(0, 16)}...
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    title="Download functionality coming soon"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(file.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
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
