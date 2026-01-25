'use client'

import React from "react"

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Upload, Lock, Loader2, Check, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { uploadFile, type UploadProgress, type UploadStage } from '@/lib/upload-service'
import type { FileMetadata } from '@/lib/indexed-storage'

interface EncryptionUploaderProps {
  vaultId: string
  publicKey: string
  onFileUpload: (file: FileMetadata) => void
  stealthMode?: boolean
  onDragStateChange?: (isDragging: boolean) => void
}

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
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    // Debounce drag events - only update state once per animation frame
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current)
    }
    
    if (!isDragOver) {
      setIsDragOver(true)
      onDragStateChange?.(true)
    }
  }, [isDragOver, onDragStateChange])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    // Debounce with requestAnimationFrame for smooth performance
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragOver(false)
      onDragStateChange?.(false)
    }, 50)
  }, [onDragStateChange])

  const handleUpload = async (file: File) => {
    setFileName(file.name)
    setError(null)
    setProgress(0)
    setCurrentChunk(0)
    setTotalChunks(0)

    // Handle progress updates from the upload service
    const handleProgress = (uploadProgress: UploadProgress) => {
      setStage(uploadProgress.stage)
      setProgress(uploadProgress.progress)
      setCurrentChunk(uploadProgress.currentChunk)
      setTotalChunks(uploadProgress.totalChunks)
      
      if (uploadProgress.stage === 'error') {
        setError(uploadProgress.message)
      }
    }

    try {
      // Call the real upload service with AES-GCM encryption
      const result = await uploadFile(file, vaultId, publicKey, handleProgress)

      if (result.success && result.fileMetadata) {
        // Notify parent component of successful upload
        onFileUpload(result.fileMetadata)
        
        // Reset after showing success
        setTimeout(() => {
          setStage('idle')
          setProgress(0)
          setCurrentChunk(0)
          setTotalChunks(0)
          setFileName('')
        }, 2000)
      } else {
        setStage('error')
        setError(result.error || 'Upload failed')
        
        // Reset after showing error
        setTimeout(() => {
          setStage('idle')
          setProgress(0)
          setError(null)
          setFileName('')
        }, 3000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setStage('error')
      setError(errorMessage)
      
      setTimeout(() => {
        setStage('idle')
        setProgress(0)
        setError(null)
        setFileName('')
      }, 3000)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDragStateChange?.(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      await handleUpload(file)
    }
  }, [vaultId, publicKey, onFileUpload, onDragStateChange])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleUpload(file)
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const getStageMessage = () => {
    switch (stage) {
      case 'scanning': 
        return totalChunks > 0 ? `Scanning: ${totalChunks} shards needed` : 'Scanning file...'
      case 'sharding': 
        return `Creating ${totalChunks} encrypted shards...`
      case 'encrypting': 
        return currentChunk > 0 ? `Encrypting shard ${currentChunk}/${totalChunks}...` : 'Generating encryption key...'
      case 'uploading': 
        return currentChunk > 0 ? `Uploading shard ${currentChunk}/${totalChunks}...` : 'Connecting to Blossom relay...'
      case 'complete': 
        return `Encrypted & uploaded (${totalChunks} shards)`
      case 'error': 
        return error || 'Upload failed'
      default: 
        return 'Drop files to encrypt & upload'
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
        style={{
          willChange: isDragOver ? 'border-color, background-color' : 'auto',
          backfaceVisibility: 'hidden',
        }}
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
          <div className="relative mb-4" style={{ backfaceVisibility: 'hidden' }}>
            <AnimatePresence mode="wait">
              {stage === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center"
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
                >
                  {/* Shard Animation - 4 pieces splitting using layout animation */}
                  {[
                    { tx: '-20px', ty: '-20px', delay: 0 },
                    { tx: '20px', ty: '-20px', delay: 0.1 },
                    { tx: '-20px', ty: '20px', delay: 0.2 },
                    { tx: '20px', ty: '20px', delay: 0.3 },
                  ].map((shard, i) => (
                    <motion.div
                      key={i}
                      layout
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Number.parseInt(shard.tx),
                        y: Number.parseInt(shard.ty),
                        opacity: 0.6,
                        scale: 0.4,
                      }}
                      transition={{ 
                        delay: shard.delay, 
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="absolute inset-0 w-8 h-8 rounded-lg bg-accent/30 border border-accent/50 flex items-center justify-center"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
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
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
                  style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
