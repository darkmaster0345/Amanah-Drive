'use client'

import { motion } from 'framer-motion'
import { Lock, ArrowDown } from 'lucide-react'

export function FirstTimeSovereign() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {/* Minimalist Vault Illustration */}
      <motion.div
        className="relative w-32 h-32 mb-8"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Outer vault door */}
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vault door outline */}
          <rect
            x="20"
            y="20"
            width="80"
            height="80"
            rx="8"
            className="fill-none stroke-primary"
            strokeWidth="2"
          />
          
          {/* Door frame effect */}
          <rect
            x="25"
            y="25"
            width="70"
            height="70"
            rx="6"
            className="fill-none stroke-primary/30"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          
          {/* Lock circle */}
          <circle
            cx="60"
            cy="65"
            r="12"
            className="fill-none stroke-primary"
            strokeWidth="2"
          />
          
          {/* Lock shackle */}
          <path
            d="M 52 65 A 8 8 0 0 1 68 65"
            className="fill-none stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Key hole */}
          <circle
            cx="60"
            cy="65"
            r="3"
            className="fill-primary"
          />
          
          {/* Accent lines (sovereign rays) */}
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            className="fill-none stroke-primary/20"
            strokeWidth="0.5"
            animate={{ r: [50, 55] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </motion.div>

      {/* Text Content */}
      <h3 className="text-2xl font-bold text-foreground mb-2 text-center">
        Your Keys, Your Data
      </h3>
      
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
        Begin your sovereign journey. All files are encrypted on your device before ever leaving.
      </p>

      {/* Animated drop indicator */}
      <motion.div
        className="flex flex-col items-center gap-2 text-accent"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ArrowDown className="w-5 h-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Drop a file</span>
      </motion.div>
    </div>
  )
}
