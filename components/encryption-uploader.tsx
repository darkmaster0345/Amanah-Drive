'use client'

import React from "react"

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Upload, Lock, Loader2, Check, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { FileMetadata } from '@/lib/indexed-storage'

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

  const simulateUpload = async (file: File) => {
    setFileName(file.name)
    setError(null)
    
    // Stage 1: Scanning
    setStage('scanning')
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Stage 2: Sharding
    setStage('sharding')
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Stage 3: Encrypting
    setStage('encrypting')
    setProgress(0)
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Stage 4: Uploading
    setStage('uploading')
    setProgress(0)
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i)
      await new Promise(resolve => setTimeout(resolve, 80))
    }
    
    // Complete
    setStage('complete')
    
    // Create mock file metadata
    const mockFile: FileMetadata = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      vaultId,
      encryptionKeyHash: 'mock-hash-' + Date.now(),
      chunkHashes: ['shard1', 'shard2', 'shard3', 'shard4'],
      totalChunks: 4,
      blossomServer: 'https://nostr.build',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    onFileUpload(mockFile)
    
    // Reset after delay
    setTimeout(() => {
      setStage('idle')
      setProgress(0)
      setFileName('')
    }, 2000)
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      await simulateUpload(file)
    }
  }, [vaultId, publicKey, onFileUpload])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await simulateUpload(file)
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
                <motion.div
                  key="sharding"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative w-16 h-16"
                >
                  {/* Shard Animation - 4 pieces splitting */}
                  {[
                    { tx: '-20px', ty: '-20px', delay: 0 },
                    { tx: '20px', ty: '-20px', delay: 0.1 },
                    { tx: '-20px', ty: '20px', delay: 0.2 },
                    { tx: '20px', ty: '20px', delay: 0.3 },
                  ].map((shard, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Number.parseInt(shard.tx),
                        y: Number.parseInt(shard.ty),
                        opacity: 0.6,
                        scale: 0.4,
                      }}
                      transition={{ delay: shard.delay, duration: 0.5 }}
                      className="absolute inset-0 w-8 h-8 rounded-lg bg-accent/30 border border-accent/50 flex items-center justify-center"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <Lock className="w-3 h-3 text-accent" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {(stage === 'encrypting' || stage === 'uploading') && (
                <motion.div
                  key="progress"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center cyan-glow"
                >
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </motion.div>
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
