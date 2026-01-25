'use client'

import React, { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FileMetadata } from '@/lib/indexed-storage'

interface FileCardProps {
  file: FileMetadata
  index: number
  stealthMode: boolean
  onSelectFile: (file: FileMetadata) => void
  onDeleteFile: (fileId: string) => void
  getFileIcon: (mimeType: string) => React.ComponentType<{ className?: string }>
  formatFileSize: (bytes: number) => string
}

const FileCardComponent = ({
  file,
  index,
  stealthMode,
  onSelectFile,
  onDeleteFile,
  getFileIcon,
  formatFileSize,
}: FileCardProps) => {
  const FileIcon = getFileIcon(file.mimeType)
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteFile(file.id)
  }, [file.id, onDeleteFile])

  const handleClick = useCallback(() => {
    onSelectFile(file)
  }, [file, onSelectFile])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      onClick={handleClick}
      className="p-4 rounded-xl glass-card cursor-pointer hover:border-primary/30 transition-all file-card group will-change-transform"
      style={{ backfaceVisibility: 'hidden' }}
    >
      {/* File Icon */}
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors will-change-transform" style={{ backfaceVisibility: 'hidden' }}>
        <FileIcon className="w-6 h-6 text-primary" />
      </div>

      {/* File Name with Frosted Glass Overlay in Stealth Mode */}
      <div className="relative">
        <p className={cn(
          'font-medium text-foreground truncate transition-all',
          stealthMode && 'blur-sm'
        )}>
          {file.name}
        </p>
        {stealthMode && (
          <div className="absolute inset-0 rounded backdrop-blur-md bg-black/20 pointer-events-none" />
        )}
      </div>

      {/* File Size */}
      <p className="text-xs text-muted-foreground mt-1">
        {formatFileSize(file.size)}
      </p>

      {/* Shard Map - Memoized separately */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex gap-1">
          {Array.from({ length: file.totalChunks || 4 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-muted-foreground/50 will-change-transform"
              style={{ backfaceVisibility: 'hidden' }}
              animate={{
                backgroundColor: i < Math.floor((Math.random() * (file.totalChunks || 4)) + 1) ? '#D4AF37' : '#4A4A4A',
              }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
      </div>

      {/* Hover Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute top-2 right-2 gap-1 flex will-change-transform"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 bg-background/50 hover:bg-primary/10 text-primary"
                onClick={handleDelete}
              >
                <Lock className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Encrypted with AES-256-GCM</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </motion.div>
  )
}

export const FileCard = memo(FileCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.file.name === nextProps.file.name &&
    prevProps.file.size === nextProps.file.size &&
    prevProps.stealthMode === nextProps.stealthMode &&
    prevProps.index === nextProps.index
  )
})

FileCard.displayName = 'FileCard'
