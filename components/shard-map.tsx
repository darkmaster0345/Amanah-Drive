'use client'

import React, { memo } from 'react'
import { motion } from 'framer-motion'

interface ShardMapProps {
  progress: number
  totalShards?: number
}

const ShardMapComponent = ({ progress, totalShards = 8 }: ShardMapProps) => {
  const filledShards = Math.ceil((progress / 100) * totalShards)

  return (
    <div className="flex gap-2 items-center flex-wrap will-change-transform">
      {Array.from({ length: totalShards }).map((_, i) => {
        const isFilled = i < filledShards
        return (
          <motion.svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className="flex-shrink-0"
            style={{ backfaceVisibility: 'hidden' }}
            animate={{
              scale: isFilled ? [0.8, 1, 0.8] : 1,
              opacity: isFilled ? [0.6, 1, 0.6] : 0.4,
            }}
            transition={{
              duration: isFilled ? 1.5 : 0.3,
              repeat: isFilled ? Infinity : 0,
              delay: i * 0.1,
            }}
          >
            {/* Hexagonal shard */}
            <polygon
              points="8,1 14,4 14,11 8,14 2,11 2,4"
              fill={isFilled ? '#D4AF37' : '#4A4A4A'}
              stroke={isFilled ? '#D4AF37' : '#2A2A2A'}
              strokeWidth="0.5"
            />
          </motion.svg>
        )
      })}
    </div>
  )
}

export const ShardMap = memo(ShardMapComponent, (prevProps, nextProps) => {
  return prevProps.progress === nextProps.progress && prevProps.totalShards === nextProps.totalShards
})
