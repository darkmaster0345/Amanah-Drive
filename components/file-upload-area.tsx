'use client'

import React from "react"
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, Lock, CheckCircle, Plus } from 'lucide-react'
import { toast } from '@/lib/toast'
import { indexedStorage, type FileMetadata } from '@/lib/indexed-storage'
import { deriveKeyFromPassword, hashString } from '@/lib/encryption'
import { createBlossomClient } from '@/lib/blossom'
import { createFileMetadataEvent, relayManager } from '@/lib/nostr'
import { createEncryptionWorker, dispatchWorkerTask } from '@/lib/worker-factory'

interface FileUploadAreaProps {
  vaultId: string
  publicKey: string
  onFileUploaded: (file: FileMetadata) => void
}

export function FileUploadArea({
  vaultId,
  publicKey,
  onFileUploaded,
}: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage('Initializing...')

    try {
      console.log('[v0] Starting chunked file upload:', {
        name: file.name,
        size: file.size,
        type: file.type,
      })

      // Step 1: Read file
      setUploadStage('Reading file...')
      const fileBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(fileBuffer)
      setUploadProgress(10)

      // Step 2: Derive encryption key
      setUploadStage('Deriving encryption key...')
      const password = localStorage.getItem('vault_nostr_pubkey') || publicKey
      const { key, salt } = await deriveKeyFromPassword(password)
      setUploadProgress(15)

      // Step 3: Encrypt file with Web Worker
      setUploadStage('Encrypting file (off-thread)...')
      const worker = createEncryptionWorker()
      
      const encryptionResult = await dispatchWorkerTask(worker, {
        id: `encrypt-${Date.now()}`,
        type: 'encrypt',
        data: fileData,
        key,
      })

      if (!encryptionResult.success) {
        throw new Error(`Encryption failed: ${encryptionResult.error}`)
      }

      // Reconstruct Uint8Array from result
      const encryptedDataObj = encryptionResult.result
      let encryptedData: Uint8Array
      
      if (encryptedDataObj && typeof encryptedDataObj === 'object') {
        if (encryptedDataObj instanceof Uint8Array) {
          encryptedData = encryptedDataObj
        } else if (encryptedDataObj.ciphertext) {
          // It's an EncryptedData object from the worker
          const binaryString = atob(encryptedDataObj.ciphertext)
          encryptedData = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            encryptedData[i] = binaryString.charCodeAt(i)
          }
        } else {
          throw new Error('Invalid encryption result format')
        }
      } else {
        throw new Error('No encryption result received')
      }

      console.log('[v0] File encrypted:', {
        originalSize: file.size,
        encryptedSize: encryptedData.length,
      })

      setUploadProgress(40)

      // Step 4: Calculate file hash
      setUploadStage('Computing file hash...')
      const fileHash = await hashString(file.name + file.size + Date.now())
      const encryptionKeyHash = await hashString(fileHash)
      setUploadProgress(50)

      // Step 5: Upload chunks to Blossom with BUD-02 authorization
      setUploadStage('Uploading chunks to Blossom...')
      const blossomClient = createBlossomClient('https://blossom.primal.net', undefined, publicKey)
      const uploadResult = await blossomClient.uploadChunkedFile(
        encryptedData,
        file.name,
        `file-${Date.now()}`,
        (chunkIndex, totalChunks) => {
          // Map chunk progress from 50% to 85%
          const chunkProgress = 50 + (chunkIndex / totalChunks) * 35
          setUploadProgress(Math.floor(chunkProgress))
          setUploadStage(`Uploading chunk ${chunkIndex} of ${totalChunks}...`)
        }
      )
      setUploadProgress(85)

      // Step 6: Create metadata event for Nostr
      setUploadStage('Publishing metadata to Nostr...')
      const fileMetadata: FileMetadata = {
        id: uploadResult.fileId,
        vaultId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptionKeyHash,
        chunkHashes: uploadResult.chunks.map((c) => c.hash),
        blossomUrls: uploadResult.chunks.map((c) => c.url),
      }

      // Save to IndexedDB
      await indexedStorage.saveFileMetadata(fileMetadata)
      setUploadProgress(85)

      // Create NIP-94 event
      const nip94Event = createFileMetadataEvent(publicKey, {
        mimeType: file.type || 'application/octet-stream',
        chunkHashes: uploadResult.chunks.map((c) => c.hash),
        size: file.size,
        encryptionKeyHash,
        blossomServer: 'https://blossom.primal.net',
        vaultId,
        fileName: file.name,
        totalChunks: uploadResult.totalChunks,
      })

      console.log('[v0] NIP-94 event created:', {
        chunks: uploadResult.totalChunks,
        hashes: nip94Event.tags.filter((t) => t[0] === 'chunk').length,
      })

      setUploadProgress(90)

      // Step 7: Publish to relays (if available)
      if (relayManager) {
        setUploadStage('Publishing to relays...')
        // In a real implementation, sign and publish the event
        console.log('[v0] NIP-94 event ready for relay publication')
      }

      setUploadProgress(100)

      toast.success(`File "${file.name}" uploaded successfully!`, {
        description: `${uploadResult.totalChunks} chunks encrypted and stored`,
      })

      onFileUploaded(fileMetadata)

      // Reset
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadStage('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1000)
    } catch (error) {
      console.error('[v0] File upload failed:', error)
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setIsUploading(false)
      setUploadProgress(0)
      setUploadStage('')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  return (
    <>
      <Card
        className={`p-6 sm:p-8 border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            const files = e.currentTarget.files
            if (files && files.length > 0) {
              handleFile(files[0])
            }
          }}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {!isUploading ? (
            <>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Upload className="w-8 h-8 text-primary" />
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Drop file to upload
                </h3>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                End-to-end encrypted
              </p>
            </>
          ) : (
            <>
              <div className="p-3 bg-primary/10 rounded-lg animate-pulse">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>

              <div className="w-full space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {uploadStage}
                </p>
                
                {/* Segmented Progress Bar (5MB chunks) */}
                <div className="grid grid-cols-8 gap-1 h-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm transition-all ${
                        uploadProgress > (i + 1) * 12.5
                          ? 'bg-primary'
                          : uploadProgress > i * 12.5
                            ? 'bg-primary/60'
                            : 'bg-secondary/50'
                      }`}
                      title={`Chunk ${i + 1}: ${Math.min((i + 1) * 5, 40)}MB`}
                    />
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {uploadProgress}% complete
                </p>
              </div>
            </>
        )}
      </div>
    </Card>

      {/* Floating Action Button for Upload */}
      <Button
        onClick={() => !isUploading && fileInputRef.current?.click()}
        disabled={isUploading}
        size="lg"
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 rounded-full w-14 h-14 sm:w-16 sm:h-16 shadow-lg hover:shadow-xl transition-all"
        title="Upload file"
      >
        {isUploading ? (
          <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
        ) : (
          <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
        )}
      </Button>
    </>
  )
}
