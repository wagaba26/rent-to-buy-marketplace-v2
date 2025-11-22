'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-volt-500 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.08 }}
          transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container relative z-10 text-center"
      >
        <motion.h1
          variants={itemVariants}
          className="text-display text-7xl md:text-8xl font-extrabold mb-6 text-carbon-50"
        >
          DRIVE YOUR
          <br />
          <span className="text-volt-500 glow-text">FUTURE</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-carbon-300 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Rent-to-own vehicles with flexible payment plans.
          <br />
          No credit history? No problem. We assess your potential differently.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/vehicles"
            className="px-8 py-4 bg-volt-500 text-carbon-950 font-bold text-lg hover:bg-volt-400 transition-all duration-300 rounded-sm shadow-lg hover:shadow-glow"
          >
            BROWSE VEHICLES
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 border-2 border-carbon-600 text-carbon-50 font-bold text-lg hover:border-volt-500 hover:text-volt-500 transition-all duration-300 rounded-sm"
          >
            GET STARTED
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="p-6 bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg">
            <div className="text-3xl font-bold text-volt-500 mb-2">24/7</div>
            <div className="text-carbon-300 text-sm">FLEXIBLE PAYMENTS</div>
          </div>
          <div className="p-6 bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg">
            <div className="text-3xl font-bold text-volt-500 mb-2">AI</div>
            <div className="text-carbon-300 text-sm">CREDIT SCORING</div>
          </div>
          <div className="p-6 bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg">
            <div className="text-3xl font-bold text-volt-500 mb-2">100%</div>
            <div className="text-carbon-300 text-sm">OWNERSHIP</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

