'use client'

import { Toaster } from "@/components/ui/sonner"

import { useState, useEffect } from 'react'
import { AuthSetup } from '@/components/auth-setup'
import { VaultDashboard } from '@/components/vault-dashboard'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [publicKey, setPublicKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user has existing session on mount
    const savedPublicKey = localStorage.getItem('vault_nostr_pubkey')
    if (savedPublicKey) {
      setPublicKey(savedPublicKey)
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleAuthenticated = (pubKey: string) => {
    setPublicKey(pubKey)
    setIsAuthenticated(true)
    localStorage.setItem('vault_nostr_pubkey', pubKey)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPublicKey('')
    localStorage.removeItem('vault_nostr_pubkey')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading vault...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {!isAuthenticated ? (
        <AuthSetup onAuthenticated={handleAuthenticated} />
      ) : (
        <VaultDashboard publicKey={publicKey} onLogout={handleLogout} />
      )}
    </main>
  )
}
