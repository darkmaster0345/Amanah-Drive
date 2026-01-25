'use client'

import React from "react"

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Upload, Lock, Loader2, Check, X, Key } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ShardMap } from '@/components/shard-map'
import { toast } from 'sonner'
import { indexedStorage, type FileMetadata } from '@/lib/indexed-storage'
import { hashString, deriveKeyFromPassword } from '@/lib/encryption'
import { createBlossomClient } from '@/lib/blossom'
import { createFileMetadataEvent } from '@/lib/nostr'
import { nip19 } from 'nostr-tools'

interface EncryptionUploaderProps {
  vaultId: string
  publicKey: string
  onFileUpload: (file: FileMetadata) => void
  stealthMode?: boolean
  onDragStateChange?: (isDragging: boolean) => void
}

type UploadStage = 'idle' | 'scanning' | 'sharding' | 'encrypting' | 'uploading' | 'complete' | 'error'

export function EncryptionUploader({
  vaultId,
  publicKey,
  onFileUpload,
  stealthMode = false,
  onDragStateChange,
}: EncryptionUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [stage, setStage] = useState<UploadStage>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auth state
  const [privateKeyInput, setPrivateKeyInput] = useState('')
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false)

  // Check for saved key on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('nostr_nsec');
      if (savedKey) {
        setPrivateKeyInput(savedKey);
      } else if (!window.nostr) {
        // Only show prompt if both nsec and extension are missing
        setShowPrivateKeyInput(true);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    onDragStateChange?.(true)
  }, [onDragStateChange])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDragStateChange?.(false)
  }, [onDragStateChange])

  const handleUpload = async (file: File) => {
    // Auth Check: We need either a stored key OR a browser extension
    if (!privateKeyInput && !window.nostr) {
      setShowPrivateKeyInput(true);
      toast.error('Authentication Required', {
        description: 'Please set up your signing key to upload.'
      });
      return;
    }

    // Save key if provided
    if (privateKeyInput.startsWith('nsec')) {
      localStorage.setItem('nostr_nsec', privateKeyInput);
    }

    setFileName(file.name)
    setError(null)
    setStage('scanning')
    setProgress(0)

    try {
      // 1. Read File
      const fileBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(fileBuffer)

      // 2. Derive Key & Hash (Sharding/Encrypting Prep)
      setStage('sharding')
      const password = localStorage.getItem('vault_nostr_pubkey') || publicKey
      const { key } = await deriveKeyFromPassword(password)

      const fileHash = await hashString(file.name + file.size + Date.now())
      const encryptionKeyHash = await hashString(fileHash)

      // Handle Private Key
      let privateKeyBytes: Uint8Array | undefined;
      if (privateKeyInput) {
        try {
          if (privateKeyInput.startsWith('nsec')) {
            const { data } = nip19.decode(privateKeyInput);
            privateKeyBytes = data as Uint8Array;
          } else {
            throw new Error('Please use a valid nsec string');
          }
        } catch (e) {
          throw new Error('Invalid secret key format');
        }
      } else if (!window.nostr) {
        throw new Error('Signing method required (nsec or extension)');
      }

      // 3. Upload (handling chunking & encryption internally)
      setStage('encrypting') // Quickly transition to uploading, but show encrypting for a bit?
      // Actually 'uploadChunkedFile' does encryption on the fly.
      // We'll show 'encrypting' briefly then 'uploading'.
      await new Promise(r => setTimeout(r, 500))
      setStage('uploading')

      const blossomClient = createBlossomClient('https://nostr.build/api/v2/upload/blossom', undefined, publicKey)

      const uploadResult = await blossomClient.uploadChunkedFile(
        fileData,
        file.name,
        `file-${Date.now()}`,
        key,
        privateKeyBytes,
        (chunkIndex, totalChunks) => {
          const percent = Math.floor((chunkIndex / totalChunks) * 100)
          setProgress(percent)
        }
      )

      // 4. Save Metadata
      setStage('complete')
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
        totalChunks: uploadResult.totalChunks
      }

      await indexedStorage.saveFileMetadata(fileMetadata)
      onFileUpload(fileMetadata)

      // 5. Publish to Relays (NIP-94)
      try {
        const nip94Event = createFileMetadataEvent(publicKey, {
          mimeType: fileMetadata.mimeType,
          chunkHashes: fileMetadata.chunkHashes,
          size: fileMetadata.size,
          encryptionKeyHash: fileMetadata.encryptionKeyHash,
          blossomServer: 'https://nostr.build/api/v2/upload/blossom',
          vaultId: fileMetadata.vaultId,
          fileName: fileMetadata.name,
          totalChunks: fileMetadata.totalChunks,
        })
        console.log('[Amanah] NIP-94 Event created:', nip94Event)
        // relayManager.publish(nip94Event) // Uncomment when ready
      } catch (e) {
        console.warn('Failed to create NIP-94 event:', e)
      }

      // Reset
      setTimeout(() => {
        setStage('idle')
        setProgress(0)
        setFileName('')
      }, 2000)

    } catch (err) {
      console.error(err)
      setStage('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
      toast.error('Upload failed')
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (file) {
      await handleUpload(file)
    }
  }, [vaultId, publicKey, onFileUpload, privateKeyInput])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleUpload(file)
    }
  }

  const getStageMessage = () => {
    switch (stage) {
      case 'scanning': return 'Scanning file...'
      case 'sharding': return 'Creating encrypted shards...'
      case 'encrypting': return 'Encrypting data...'
      case 'uploading': return 'Uploading to Blossom relays...'
      case 'complete': return 'Upload complete!'
      case 'error': return error || 'Upload failed'
      default: return 'Drop files to encrypt & upload'
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showPrivateKeyInput && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/10"
          >
            <h4 className="font-semibold flex items-center gap-2 text-orange-500 mb-2 text-sm">
              <Key className="w-4 h-4" />
              Sovereign Auth Setup
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              To upload securely from any device, please provide your <strong>nsec</strong> (secret key). This will be used to sign your uploads locally.
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="nsec1..."
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                className="font-mono text-xs bg-background/50 h-8"
              />
              <Button size="sm" variant="secondary" onClick={() => setShowPrivateKeyInput(false)} className="h-8">
                Done
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => stage === 'idle' && inputRef.current?.click()}
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          isDragOver ? 'border-primary bg-primary/5 gold-glow' : 'border-border/50 hover:border-primary/30',
          stage !== 'idle' && 'cursor-default pointer-events-none'
        )}
      >
        {/* Background Pulse Animation */}
        <AnimatePresence>
          {(stage === 'scanning' || isDragOver) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent animate-pulse-glow"
            />
          )}
        </AnimatePresence>

        {/* Scanning Line Effect */}
        <AnimatePresence>
          {stage === 'scanning' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"
            />
          )}
        </AnimatePresence>

        <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
          {/* Icon with Animations */}
          <div className="relative mb-4">
            <AnimatePresence mode="wait">
              {stage === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </motion.div>
              )}

              {stage === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                >
                  <Shield className="w-8 h-8 text-primary animate-pulse" />
                </motion.div>
              )}

              {stage === 'sharding' && (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <ShardMap progress={30} totalShards={8} />
                </div>
              )}

              {(stage === 'encrypting' || stage === 'uploading') && (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <ShardMap progress={progress} totalShards={12} />
                </div>
              )}

              {stage === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center cyan-glow"
                >
                  <Check className="w-8 h-8 text-accent" />
                </motion.div>
              )}

              {stage === 'error' && (
                <motion.div
                  key="error"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center"
                >
                  <X className="w-8 h-8 text-destructive" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Text */}
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-sm font-medium text-center mb-2',
              stage === 'complete' ? 'text-accent' : stage === 'error' ? 'text-destructive' : 'text-foreground'
            )}
          >
            {getStageMessage()}
          </motion.p>

          {/* File Name */}
          {fileName && stage !== 'idle' && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {fileName}
            </p>
          )}

          {/* Progress Bar */}
          <AnimatePresence>
            {(stage === 'encrypting' || stage === 'uploading') && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[200px] mt-4"
              >
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {progress}%
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Idle State Helper Text */}
          {stage === 'idle' && (
            <p className="text-xs text-muted-foreground mt-2">
              or click to browse
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
