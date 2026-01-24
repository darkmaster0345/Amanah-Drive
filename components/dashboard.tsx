'use client'

import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FileIcon, HardDrive, Folder, Lock } from 'lucide-react'
import type { FileMetadata, Vault } from '@/lib/indexed-storage'

interface DashboardProps {
  files: FileMetadata[]
  vaults: Vault[]
  publicKey: string
}

export function Dashboard({ files, vaults, publicKey }: DashboardProps) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const totalFiles = files.length

  // Group files by MIME type
  const filesByType: Record<string, number> = {}
  files.forEach((file) => {
    const type = file.mimeType.split('/')[0] || 'other'
    filesByType[type] = (filesByType[type] || 0) + 1
  })

  const typeData = Object.entries(filesByType).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }))

  // Group files by vault
  const filesByVault: Record<string, number> = {}
  vaults.forEach((vault) => {
    const count = files.filter((f) => f.vaultId === vault.id).length
    if (count > 0) {
      filesByVault[vault.name] = count
    }
  })

  const vaultData = Object.entries(filesByVault).map(([vault, count]) => ({
    name: vault,
    files: count,
  }))

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--secondary))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of your encrypted storage
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                Total Files
              </p>
              <p className="text-2xl font-bold text-foreground">{totalFiles}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileIcon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                Total Size
              </p>
              <p className="text-2xl font-bold text-foreground">{formatSize(totalSize)}</p>
            </div>
            <div className="p-2 bg-accent/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                Vaults
              </p>
              <p className="text-2xl font-bold text-foreground">{vaults.length}</p>
            </div>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Folder className="w-5 h-5 text-secondary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                Encrypted
              </p>
              <p className="text-2xl font-bold text-foreground">100%</p>
            </div>
            <div className="p-2 bg-accent/10 rounded-lg">
              <Lock className="w-5 h-5 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      {typeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Types Chart */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Files by Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                  }}
                  textStyle={{ color: 'var(--foreground)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Vault Distribution Chart */}
          {vaultData.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Files per Vault</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vaultData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                    }}
                    textStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar
                    dataKey="files"
                    fill="var(--primary)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-accent/5 border-accent/20">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
            Privacy Status
          </p>
          <ul className="text-xs space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              All data encrypted end-to-end
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Client-side decryption only
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              Zero-knowledge architecture
            </li>
          </ul>
        </Card>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            Identity
          </p>
          <p className="font-mono text-xs text-foreground break-all mb-3">
            {publicKey}
          </p>
          <p className="text-xs text-muted-foreground">
            Nostr public key for identity and sharing
          </p>
        </Card>
      </div>
    </div>
  )
}
