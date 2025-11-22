'use client'

import { motion } from 'framer-motion'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export default function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const spinner = (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-carbon-700 border-t-volt-500 rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-carbon-950/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          {text && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-carbon-300 text-sm"
            >
              {text}
            </motion.p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      {spinner}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-carbon-300 text-sm"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

