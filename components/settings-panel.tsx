'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings, Moon, Sun, Lock, Shield, Zap } from 'lucide-react'

export function SettingsPanel() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('vault-theme') as 'light' | 'dark' | 'auto' | null
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme('auto')
      applyTheme('auto', prefersDark)
    }
  }, [])

  const applyTheme = (mode: 'light' | 'dark' | 'auto', isDarkSystem?: boolean) => {
    const html = document.documentElement

    if (mode === 'light') {
      html.classList.remove('dark')
    } else if (mode === 'dark') {
      html.classList.add('dark')
    } else {
      // Auto mode
      const isDark = isDarkSystem ?? window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    localStorage.setItem('vault-theme', mode)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your Vault experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'auto', label: 'Auto', icon: Zap },
                { id: 'dark', label: 'Dark', icon: Moon },
              ] as const).map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={theme === id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleThemeChange(id)}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </h3>
            <Card className="p-3 space-y-2 bg-secondary/30">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">End-to-End Encryption</p>
                  <p className="text-xs text-muted-foreground">
                    All files are encrypted with AES-256 before upload
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* About Section */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm text-foreground">About</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Vault v1.0.0</p>
              <p>Decentralized file storage powered by Nostr & Blossom</p>
              <p className="pt-2">FOSS • Open Source • No Tracking</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
