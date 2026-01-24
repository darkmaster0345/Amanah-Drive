'use client'

import { useState, useEffect } from 'react'
import { Shield, Wifi, WifiOff, Check, AlertCircle, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PrivacyStatusBarProps {
  publicKey: string
  onThemeToggle?: () => void
}

export function PrivacyStatusBar({ publicKey, onThemeToggle }: PrivacyStatusBarProps) {
  const [nostrConnected, setNostrConnected] = useState(false)
  const [blossomConnected, setBlossomConnected] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)

    // Simulate connection checks (in production, these would be real checks)
    const timer = setTimeout(() => {
      setNostrConnected(true)
      setBlossomConnected(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleThemeToggle = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      setIsDarkMode(false)
      localStorage.setItem('vault-theme', 'light')
    } else {
      html.classList.add('dark')
      setIsDarkMode(true)
      localStorage.setItem('vault-theme', 'dark')
    }
    onThemeToggle?.()
  }

  return (
    <div className="w-full bg-card/80 backdrop-blur border-b border-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        {/* Privacy Indicators */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">
                End-to-End Encrypted
              </span>
            </div>
          </div>

          {/* Nostr Connection */}
          <div className="flex items-center gap-2">
            {nostrConnected ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">Nostr Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-muted-foreground">Nostr Offline</span>
              </>
            )}
          </div>

          {/* Blossom Connection */}
          <div className="flex items-center gap-2">
            {blossomConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">Blossom Active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-muted-foreground">Blossom Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Theme Toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleThemeToggle}
          className="gap-2"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          <span className="text-xs text-muted-foreground">
            {isDarkMode ? 'Light' : 'Dark'}
          </span>
        </Button>
      </div>
    </div>
  )
}
