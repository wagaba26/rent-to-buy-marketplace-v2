'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-carbon-950/80 backdrop-blur-md border-b border-carbon-800"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-display text-2xl font-bold text-volt-500 hover:text-volt-400 transition-colors">
            RENT→OWN
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/vehicles" className="text-carbon-200 hover:text-volt-500 transition-colors text-sm font-medium">
              VEHICLES
            </Link>
            <Link href="/dashboard" className="text-carbon-200 hover:text-volt-500 transition-colors text-sm font-medium">
              DASHBOARD
            </Link>
            <Link href="/login" className="text-carbon-200 hover:text-volt-500 transition-colors text-sm font-medium">
              LOGIN
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2 bg-volt-500 text-carbon-950 font-bold text-sm hover:bg-volt-400 transition-colors rounded-sm"
            >
              GET STARTED
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-carbon-200 hover:text-volt-500 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 pb-4 space-y-4"
          >
            <Link href="/vehicles" className="block text-carbon-200 hover:text-volt-500 transition-colors">
              VEHICLES
            </Link>
            <Link href="/dashboard" className="block text-carbon-200 hover:text-volt-500 transition-colors">
              DASHBOARD
            </Link>
            <Link href="/login" className="block text-carbon-200 hover:text-volt-500 transition-colors">
              LOGIN
            </Link>
            <Link 
              href="/register" 
              className="block px-6 py-2 bg-volt-500 text-carbon-950 font-bold text-sm hover:bg-volt-400 transition-colors rounded-sm w-fit"
            >
              GET STARTED
            </Link>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}

