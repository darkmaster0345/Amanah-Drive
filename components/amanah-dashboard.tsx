'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Vault, Share2, Radio, Settings, Eye, EyeOff, ChevronRight, Lock, Unlock, FileText, ImageIcon, Film, Music, Archive, MoreHorizontal, Plus, Search, LogOut, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EncryptionUploader } from '@/components/encryption-uploader'
import { FileCard } from '@/components/file-card'
import { cn } from '@/lib/utils'
import type { FileMetadata, Vault as VaultType } from '@/lib/indexed-storage'

interface AmanahDashboardProps {
  publicKey: string
  files: FileMetadata[]
  vaults: VaultType[]
  selectedVault: VaultType | null
  onSelectVault: (vault: VaultType) => void
  onFileUpload: (file: FileMetadata) => void
  onSelectFile: (file: FileMetadata | null) => void
  onDeleteFile: (fileId: string) => void
  onCreateVault: () => void
  onLogout: () => void
}

// Mock relay status data
const relayStatus = [
  { name: 'nostr.build', status: 'connected', ping: 45 },
  { name: 'satellite.earth', status: 'connected', ping: 78 },
  { name: 'void.cat', status: 'disconnected', ping: null },
]

export function AmanahDashboard({
  publicKey,
  files,
  vaults,
  selectedVault,
  onSelectVault,
  onFileUpload,
  onSelectFile,
  onDeleteFile,
  onCreateVault,
  onLogout,
}: AmanahDashboardProps) {
  const [stealthMode, setStealthMode] = useState(false)
  const [activeNav, setActiveNav] = useState<'vault' | 'shared' | 'relays' | 'settings'>('vault')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)

  const maskedPubkey = `npub1...${publicKey.substring(publicKey.length - 4)}`
  
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType.startsWith('video/')) return Film
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // Calculate security score
  const securityScore = Math.min(100, 70 + (files.length > 0 ? 15 : 0) + (vaults.length > 1 ? 15 : 0))

  return (
    <TooltipProvider>
      <motion.div 
        className="h-screen flex bg-background overflow-hidden"
        animate={{ scale: isDragActive ? 0.98 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.2 }}
        style={{ 
          willChange: isDragActive ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Left Sidebar - Slim Navigation */}
        <aside className="w-16 md:w-20 flex flex-col items-center py-6 bg-sidebar border-r border-sidebar-border">
          {/* Header with Stealth Toggle */}
          <div className="flex-1 flex flex-col border-b border-sidebar-border pb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 gold-glow cursor-pointer hover:bg-primary/15 transition-colors">
              <Vault className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Navigation Icons */}
          <nav className="flex-1 flex flex-col items-center gap-4 py-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveNav('vault')}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                    activeNav === 'vault'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Shield className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Vault</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveNav('shared')}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                    activeNav === 'shared'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Shared</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveNav('relays')}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all relative',
                    activeNav === 'relays'
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Radio className="w-5 h-5" />
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Relays</TooltipContent>
            </Tooltip>
          </nav>

          {/* Stealth Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setStealthMode(!stealthMode)}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-all mb-6',
                  stealthMode
                    ? 'bg-accent text-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                {stealthMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {stealthMode ? 'Disable Stealth Mode' : 'Enable Stealth Mode'}
            </TooltipContent>
          </Tooltip>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-accent transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 px-6 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-foreground">
                {selectedVault?.name || 'Amanah'}
              </h1>
              <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                {maskedPubkey}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 bg-secondary/50 border-border/50 focus:border-primary/50"
                />
              </div>

              {/* Privacy Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStealthMode(!stealthMode)}
                    className={cn(
                      'rounded-xl transition-all',
                      stealthMode && 'bg-accent/10 text-accent'
                    )}
                  >
                    {stealthMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stealthMode ? 'Disable Stealth Mode' : 'Enable Stealth Mode'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Content Grid */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Column 1: Vault List */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Vaults
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCreateVault}
                    className="w-8 h-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {vaults.map((vault) => (
                    <motion.button
                      key={vault.id}
                      onClick={() => onSelectVault(vault)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'w-full p-4 rounded-xl glass-card text-left transition-all duration-200',
                        selectedVault?.id === vault.id
                          ? 'border-primary/50 gold-glow'
                          : 'hover:border-border/80'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          selectedVault?.id === vault.id ? 'bg-primary/20' : 'bg-secondary'
                        )}>
                          <Vault className={cn(
                            'w-5 h-5',
                            selectedVault?.id === vault.id ? 'text-primary' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{vault.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {files.filter(f => f.vaultId === vault.id).length} files
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  ))}
                </div>

{/* Encryption Uploader */}
{selectedVault && (
<EncryptionUploader
vaultId={selectedVault.id}
publicKey={publicKey}
onFileUpload={onFileUpload}
stealthMode={stealthMode}
onDragStateChange={setIsDragActive}
/>
)}
              </div>

              {/* Column 2: File Explorer */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Files
                </h2>

                <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-auto pr-2">
                  <AnimatePresence>
                    {filteredFiles.length === 0 ? (
                      <div className="p-8 text-center glass-card rounded-xl">
                        <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No files yet. Upload to start.
                        </p>
                      </div>
                    ) : (
                      filteredFiles.map((file, index) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          index={index}
                          stealthMode={stealthMode}
                          onSelectFile={onSelectFile}
                          onDeleteFile={onDeleteFile}
                          getFileIcon={getFileIcon}
                          formatFileSize={formatFileSize}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Column 3: Encryption Vault Context */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Encryption Vault
                </h2>

                {/* Security Score */}
                <div className="p-5 rounded-xl glass-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">Security Score</span>
                    <span className="text-2xl font-bold text-primary">{securityScore}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${securityScore}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {securityScore >= 90 ? 'Excellent' : securityScore >= 70 ? 'Good' : 'Needs improvement'}
                  </p>
                </div>

                {/* Session Keys */}
                <div className="p-5 rounded-xl glass-card">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Session Keys
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <span className="text-xs font-mono text-muted-foreground">Master Key</span>
                      <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <span className="text-xs font-mono text-muted-foreground">File Keys</span>
                      <span className="text-xs text-muted-foreground">{files.length} derived</span>
                    </div>
                  </div>
                </div>

                {/* Relay Status */}
                <div className="p-5 rounded-xl glass-card">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    Blossom Relays
                  </h3>
                  <div className="space-y-2">
                    {relayStatus.map((relay) => (
                      <div
                        key={relay.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              relay.status === 'connected' ? 'bg-accent' : 'bg-destructive'
                            )} />
                            {relay.status === 'connected' && (
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent animate-ping-dot" />
                            )}
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {relay.name}
                          </span>
                        </div>
                        {relay.ping && (
                          <span className="text-xs text-muted-foreground">{relay.ping}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl glass-card text-center">
                    <p className="text-2xl font-bold text-foreground">{files.length}</p>
                    <p className="text-xs text-muted-foreground">Total Files</p>
                  </div>
                  <div className="p-4 rounded-xl glass-card text-center">
                    <p className="text-2xl font-bold text-foreground">{vaults.length}</p>
                    <p className="text-xs text-muted-foreground">Vaults</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Relay Status Footer */}
        <footer className="fixed bottom-0 left-16 md:left-20 right-0 h-8 px-4 flex items-center justify-between bg-card/80 backdrop-blur-sm border-t border-border text-xs">
          <div className="flex items-center gap-4">
            {relayStatus.map((relay) => (
              <div key={relay.name} className="flex items-center gap-1.5">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  relay.status === 'connected' ? 'bg-accent' : 'bg-destructive'
                )} />
                <span className="text-muted-foreground">{relay.name}</span>
              </div>
            ))}
          </div>
          <div className="text-muted-foreground">
            Amanah v1.0 - Sovereign Storage
          </div>
        </footer>
      </motion.div>
    </TooltipProvider>
  )
}
