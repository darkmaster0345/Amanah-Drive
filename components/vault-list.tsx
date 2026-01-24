'use client'

import { Button } from '@/components/ui/button'
import { Folder } from 'lucide-react'
import type { Vault } from '@/lib/db'

interface VaultListProps {
  vaults: Vault[]
  selectedVault: Vault | null
  onSelectVault: (vault: Vault) => void
}

export function VaultList({
  vaults,
  selectedVault,
  onSelectVault,
}: VaultListProps) {
  return (
    <div className="space-y-1">
      {vaults.map((vault) => (
        <Button
          key={vault.id}
          onClick={() => onSelectVault(vault)}
          variant={selectedVault?.id === vault.id ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Folder className="w-4 h-4" />
          <span className="truncate">{vault.name}</span>
        </Button>
      ))}
    </div>
  )
}
