'use client'

import { motion } from 'framer-motion'
import { Shield, Radio } from 'lucide-react'

interface SecurityTooltipProps {
  cipher: string
  relays: string[]
}

export function SecurityTooltip({ cipher, relays }: SecurityTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="pointer-events-none"
    >
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg glass-card">
        {/* Cipher Info */}
        <div className="flex items-start gap-2 mb-3 pb-3 border-b border-border/50">
          <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Cipher</p>
            <p className="text-muted-foreground font-mono text-xs">{cipher}</p>
          </div>
        </div>

        {/* Relays Info */}
        <div className="flex items-start gap-2">
          <Radio className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-foreground mb-1">Stored on</p>
            <div className="space-y-1">
              {relays.map((relay, i) => (
                <div key={i} className="flex items-center gap-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-accent"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                  <span className="text-muted-foreground">{relay}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
