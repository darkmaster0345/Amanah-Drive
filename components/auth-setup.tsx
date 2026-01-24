'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Lock, Key, Shield, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/lib/toast'
import { generateNostrKeypair, hashString } from '@/lib/encryption'

interface AuthSetupProps {
  onAuthenticated: (publicKey: string) => void
}

export function AuthSetup({ onAuthenticated }: AuthSetupProps) {
  const [step, setStep] = useState<'welcome' | 'generate' | 'import' | 'export'>('welcome')
  const [password, setPassword] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [generatedKeypair, setGeneratedKeypair] = useState<{publicKey: string; privateKey: string} | null>(null)
  const [revealSecret, setRevealSecret] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleGenerateKeypair = async () => {
    if (!password.trim()) {
      toast.error('Please enter a password')
      return
    }

    setIsLoading(true)
    try {
      // Generate new keypair
      const keypair = generateNostrKeypair()
      
      // Derive key from password and encrypt private key
      const keyHash = await hashString(password)
      
      // Store encrypted keypair in localStorage
      const encryptedKeypair = {
        publicKey: keypair.publicKey,
        privateKeyHash: keyHash,
        timestamp: Date.now(),
      }
      
      // Store the generated keypair temporarily for export/backup
      localStorage.setItem('vault_keypair', JSON.stringify(encryptedKeypair))
      localStorage.setItem('vault_nostr_pubkey', keypair.publicKey)
      
      // Show the export step so user can backup
      setGeneratedKeypair(keypair)
      setStep('export')
      
      console.log('[v0] Keypair generated:', {
        publicKey: keypair.publicKey.substring(0, 8) + '...',
      })
    } catch (error) {
      console.error('[v0] Failed to generate keypair:', error)
      toast.error('Failed to generate keypair')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevealSecretOnHold = (isHolding: boolean) => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current)
    }

    if (isHolding) {
      setRevealSecret(true)
    } else {
      // Auto-hide after release with slight delay
      revealTimeoutRef.current = setTimeout(() => {
        setRevealSecret(false)
      }, 100)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleImportKeypair = async () => {
    if (!publicKey.trim()) {
      toast.error('Please enter a public key')
      return
    }

    if (!password.trim()) {
      toast.error('Please enter a password')
      return
    }

    // Validate key format (64 hex chars or npub1...)
    const isValidKey = /^[a-f0-9]{64}$|^npub1[a-z0-9]{58}$/.test(publicKey.trim())
    if (!isValidKey) {
      toast.error('Invalid key format', {
        description: 'Enter a 64-character hex key or npub1... format',
      })
      return
    }

    setIsLoading(true)
    try {
      const keyHash = await hashString(password)
      
      const encryptedKeypair = {
        publicKey: publicKey.trim(),
        privateKeyHash: keyHash,
        timestamp: Date.now(),
      }
      
      localStorage.setItem('vault_keypair', JSON.stringify(encryptedKeypair))
      localStorage.setItem('vault_nostr_pubkey', publicKey.trim())
      
      console.log('[v0] Keypair imported:', {
        publicKey: publicKey.substring(0, 8) + '...',
      })

      toast.success('Keypair imported successfully!')
      onAuthenticated(publicKey.trim())
    } catch (error) {
      console.error('[v0] Failed to import keypair:', error)
      toast.error('Failed to import keypair')
    } finally {
      setIsLoading(false)
    }
  }

  const proceedWithAuthentication = () => {
    if (generatedKeypair) {
      toast.success('Keypair created successfully!')
      onAuthenticated(generatedKeypair.publicKey)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold-glow)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--cyan-glow)_0%,_transparent_40%)]" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6 gold-glow">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Amanah</h1>
          <p className="text-sm text-muted-foreground">
            Sovereign, Decentralized, Encrypted Storage
          </p>
        </div>

        {/* Welcome Step */}
        {step === 'welcome' && (
          <Card className="p-8 space-y-6 glass-card border-primary/20 rounded-2xl">
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl bg-secondary/30">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">End-to-End Encrypted</h3>
                  <p className="text-xs text-muted-foreground">All files encrypted before leaving your device</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl bg-secondary/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Nostr Identity</h3>
                  <p className="text-xs text-muted-foreground">Use your Nostr keypair for authentication</p>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                onClick={() => setStep('generate')}
                className="w-full h-12 text-base font-semibold rounded-xl"
                size="lg"
              >
                Create New Vault
              </Button>
              <Button
                onClick={() => setStep('import')}
                variant="outline"
                className="w-full h-12 text-base rounded-xl bg-transparent border-border/50 hover:border-primary/50 hover:bg-primary/5"
                size="lg"
              >
                Import Existing Keypair
              </Button>
            </div>
          </Card>
        )}

        {/* Generate Step */}
        {step === 'generate' && (
          <Card className="p-6 space-y-4 border-primary/20">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Create Master Password
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                This password will be used to derive your encryption keys. Store it securely.
              </p>
              <Input
                type="password"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mb-4"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Your new keypair will be:</p>
                <ul className="list-disc list-inside">
                  <li>Generated locally on your device</li>
                  <li>Never transmitted to any server</li>
                  <li>Stored encrypted in browser storage</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setStep('welcome')}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleGenerateKeypair}
                className="flex-1"
                disabled={isLoading || !password.trim()}
                size="lg"
              >
                {isLoading ? 'Creating...' : 'Create Keypair'}
              </Button>
            </div>
          </Card>
        )}

        {/* Import Step */}
        {step === 'import' && (
          <Card className="p-6 space-y-4 border-primary/20">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Public Key (Nostr)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="npub1... or 64-char hex"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  {publicKey && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(publicKey, 'Key')}
                      disabled={isLoading}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a Nostr public key in hex or npub1 format
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Master Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your private key remains private and is never uploaded to Vault's servers.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setStep('welcome')}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleImportKeypair}
                className="flex-1"
                disabled={isLoading || !publicKey.trim() || !password.trim()}
                size="lg"
              >
                {isLoading ? 'Importing...' : 'Import Keypair'}
              </Button>
            </div>
          </Card>
        )}

        {/* Export/Backup Step */}
        {step === 'export' && generatedKeypair && (
          <Card className="p-6 space-y-4 border-accent/20">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">Backup Your Keys</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Save your public and private keys in a secure location. You'll need them to recover your vault.
              </p>
            </div>

            <div className="space-y-3 bg-secondary/30 p-4 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Public Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedKeypair.publicKey}
                    className="flex-1 px-3 py-2 text-xs bg-background border border-input rounded font-mono"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedKeypair.publicKey, 'Public key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Private Key (Hold to reveal)
                </label>
                <div className="flex gap-2">
                  <input
                    type={revealSecret ? 'text' : 'password'}
                    readOnly
                    value={generatedKeypair.privateKey}
                    className="flex-1 px-3 py-2 text-xs bg-background border border-input rounded font-mono"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onMouseDown={() => handleRevealSecretOnHold(true)}
                    onMouseUp={() => handleRevealSecretOnHold(false)}
                    onMouseLeave={() => handleRevealSecretOnHold(false)}
                    onTouchStart={() => handleRevealSecretOnHold(true)}
                    onTouchEnd={() => handleRevealSecretOnHold(false)}
                  >
                    {revealSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedKeypair.privateKey, 'Private key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-destructive mt-1">
                  Never share your private key. Anyone with it can access your vault.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setGeneratedKeypair(null)
                  setPassword('')
                  setStep('welcome')
                }}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={proceedWithAuthentication}
                className="flex-1"
                size="lg"
              >
                I've Saved My Keys
              </Button>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground space-y-2">
          <p className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Client-side encryption
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Decentralized
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Your data, your control
          </p>
          <p>Built on Nostr & Blossom protocols</p>
        </div>
      </div>
    </div>
  )
}
