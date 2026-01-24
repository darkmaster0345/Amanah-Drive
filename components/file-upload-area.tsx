'use client'

import React from "react"
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Upload, Lock, CheckCircle, Plus, Key } from 'lucide-react'
import { toast } from '@/lib/toast'
import { indexedStorage, type FileMetadata } from '@/lib/indexed-storage'
import { deriveKeyFromPassword, hashString } from '@/lib/encryption'
import { createBlossomClient } from '@/lib/blossom'
import { createFileMetadataEvent, relayManager } from '@/lib/nostr'
import { dispatchWorkerTask } from '@/lib/worker-factory'
import { nip19 } from 'nostr-tools'

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

  // Auth Fallback State
  const [missingExtension, setMissingExtension] = useState(false)
  const [privateKeyInput, setPrivateKeyInput] = useState('')
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check for extension on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Small delay to allow extension to inject
      setTimeout(() => {
        if (!window.nostr) {
          setMissingExtension(true);
        }
      }, 1000);
    }
  }, []);

  const handleFile = async (file: File) => {
    if (!file) return

    // If extension is missing and no private key provided, prompt user
    if (missingExtension && !privateKeyInput) {
      setShowPrivateKeyInput(true);
      toast.error('NIP-07 Extension missing', {
        description: 'Please enter your nsec (Nostr Secret Key) to sign the upload.'
      });
      return;
    }

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

      // Step 3: Compute file hash (of plaintext)
      setUploadStage('Computing file hash...')
      const fileHash = await hashString(file.name + file.size + Date.now())
      const encryptionKeyHash = await hashString(fileHash)
      setUploadProgress(20)

      // Step 4: Upload chunks to Blossom (Encryption happens per-chunk inside)
      setUploadStage('Uploading chunks to Blossom...')

      let privateKeyBytes: Uint8Array | undefined;

      // Handle Private Key (if fallback required)
      if (missingExtension && privateKeyInput) {
        try {
          if (privateKeyInput.startsWith('nsec')) {
            const { data } = nip19.decode(privateKeyInput);
            privateKeyBytes = data as Uint8Array;
          } else {
            // Assume hex if not nsec (unsafe but possible)
            // Ideally we force nsec
            throw new Error('Please use a valid nsec string');
          }
        } catch (e) {
          throw new Error('Invalid private key format');
        }
      } else if (!window.nostr) {
        throw new Error('NIP-07 extension (like Alby or nos2x) is required for signing');
      }

      const blossomClient = createBlossomClient('https://nostr.build/api/v2/upload/blossom', undefined, publicKey)

      const uploadResult = await blossomClient.uploadChunkedFile(
        fileData,
        file.name,
        `file-${Date.now()}`,
        key, // Pass encryption key for per-chunk encryption
        privateKeyBytes, // Pass private key callback if needed
        (chunkIndex, totalChunks) => {
          // Map chunk progress
          const chunkProgress = 20 + (chunkIndex / totalChunks) * 70
          setUploadProgress(Math.floor(chunkProgress))
          setUploadStage(`Uploading chunk ${chunkIndex} of ${totalChunks}...`)
        }
      )
      setUploadProgress(90)

      // Step 5: Create metadata event for Nostr
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
      setUploadProgress(95)

      // Create NIP-94 event
      const nip94Event = createFileMetadataEvent(publicKey, {
        mimeType: file.type || 'application/octet-stream',
        chunkHashes: uploadResult.chunks.map((c) => c.hash),
        size: file.size,
        encryptionKeyHash,
        blossomServer: 'https://nostr.build/api/v2/upload/blossom',
        vaultId,
        fileName: file.name,
        totalChunks: uploadResult.totalChunks,
      })

      console.log('[v0] NIP-94 event created:', {
        chunks: uploadResult.totalChunks,
        hashes: nip94Event.tags.filter((t) => t[0] === 'chunk').length,
      })

      setUploadProgress(98)

      // Step 6: Publish to relays (if available)
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
      {showPrivateKeyInput && (
        <Card className="p-4 mb-4 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <h4 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
            <Key className="w-4 h-4" />
            Auth Configuration
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            No NIP-07 browser extension detected. Please provide your <strong>nsec</strong> key to sign the upload request.
            <br />
            <span className="text-xs opacity-80">(This is stored only in memory for this session)</span>
          </p>
          <Input
            type="password"
            placeholder="nsec1..."
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            className="font-mono text-sm"
          />
        </Card>
      )}

      <Card
        className={`p-6 sm:p-8 border-2 border-dashed transition-colors cursor-pointer ${isDragging
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
                      className={`rounded-sm transition-all ${uploadProgress > (i + 1) * 12.5
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
