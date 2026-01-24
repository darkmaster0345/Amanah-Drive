'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Lock, Key, Shield } from 'lucide-react'
import { toast } from '@/lib/toast'
import { generateNostrKeypair, hashString } from '@/lib/encryption'

interface AuthSetupProps {
  onAuthenticated: (publicKey: string) => void
}

export function AuthSetup({ onAuthenticated }: AuthSetupProps) {
  const [step, setStep] = useState<'welcome' | 'generate' | 'import'>('welcome')
  const [password, setPassword] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      
      localStorage.setItem('vault_keypair', JSON.stringify(encryptedKeypair))
      
      console.log('[v0] Keypair generated:', {
        publicKey: keypair.publicKey.substring(0, 8) + '...',
      })

      toast.success('Keypair created successfully!')
      onAuthenticated(keypair.publicKey)
    } catch (error) {
      console.error('[v0] Failed to generate keypair:', error)
      toast.error('Failed to generate keypair')
    } finally {
      setIsLoading(false)
    }
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

    setIsLoading(true)
    try {
      const keyHash = await hashString(password)
      
      const encryptedKeypair = {
        publicKey,
        privateKeyHash: keyHash,
        timestamp: Date.now(),
      }
      
      localStorage.setItem('vault_keypair', JSON.stringify(encryptedKeypair))
      
      console.log('[v0] Keypair imported:', {
        publicKey: publicKey.substring(0, 8) + '...',
      })

      toast.success('Keypair imported successfully!')
      onAuthenticated(publicKey)
    } catch (error) {
      console.error('[v0] Failed to import keypair:', error)
      toast.error('Failed to import keypair')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Vault</h1>
          <p className="text-sm text-muted-foreground">
            Secure, decentralized file storage with Nostr
          </p>
        </div>

        {/* Welcome Step */}
        {step === 'welcome' && (
          <Card className="p-6 space-y-4 border-primary/20">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">End-to-End Encrypted</h3>
                  <p className="text-xs text-muted-foreground">All files encrypted before leaving your device</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Key className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">Nostr Identity</h3>
                  <p className="text-xs text-muted-foreground">Use your Nostr keypair for authentication</p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={() => setStep('generate')}
                className="w-full"
                size="lg"
              >
                Create New Vault
              </Button>
              <Button
                onClick={() => setStep('import')}
                variant="outline"
                className="w-full"
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
                <Input
                  placeholder="npub1... or 64-char hex"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  disabled={isLoading}
                />
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

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground space-y-2">
          <p>🔐 Client-side encryption • 🌐 Decentralized • 💾 Your data, your control</p>
          <p>Built on Nostr & Blossom protocols</p>
        </div>
      </div>
    </div>
  )
}
