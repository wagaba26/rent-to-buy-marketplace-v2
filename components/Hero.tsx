'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
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
    <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.15 }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary rounded-full blur-[120px]"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 0.12 }}
          transition={{ duration: 10, delay: 0.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-accent rounded-full blur-[120px]"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/50 to-bg-primary z-0" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container relative z-10 text-center"
      >
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors cursor-default"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-sm font-semibold text-primary-light tracking-wide uppercase">
            Drive Your Dreams Today
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-8 leading-[1.1] tracking-tight"
        >
          <span className="text-white drop-shadow-lg">Your Journey to</span>
          <br />
          <span className="text-gradient drop-shadow-lg">Vehicle Ownership</span>
          <br />
          <span className="text-white drop-shadow-lg">Starts Here</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed px-4 font-light"
        >
          AutoLadder makes vehicle ownership accessible through flexible rent-to-own plans.
          <br className="hidden sm:block" />
          <span className="text-white font-medium">No credit history? No problem.</span>
          <br />
          We assess your potential differently.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-20"
        >
          <Link
            href="/vehicles"
            className="group relative px-8 py-4 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden min-w-[200px]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Browse Vehicles
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-light to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="/register"
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 min-w-[200px]"
          >
            Get Started Free
          </Link>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4"
        >
          {[
            {
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'Flexible Payments',
              description: 'Weekly or monthly plans tailored to your budget',
              gradient: 'from-primary to-primary-dark',
            },
            {
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'AI Credit Scoring',
              description: 'Advanced assessment beyond traditional credit',
              gradient: 'from-accent to-orange-600',
            },
            {
              icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: '100% Ownership',
              description: 'Own your vehicle completely after payments',
              gradient: 'from-success to-emerald-600',
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="group relative"
            >
              <div className="relative h-full p-8 bg-bg-secondary/40 backdrop-blur-md border border-white/5 rounded-3xl hover:bg-bg-secondary/60 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className={`w-14 h-14 mb-6 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                  {feature.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-3 group-hover:text-primary-light transition-colors">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed group-hover:text-white/90 transition-colors">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          variants={itemVariants}
          className="mt-20 flex flex-wrap items-center justify-center gap-8 md:gap-16 border-t border-white/5 pt-10"
        >
          {[
            { text: "Secure Platform", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
            { text: "24/7 Support", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" },
            { text: "Instant Approval", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-text-tertiary group hover:text-white transition-colors">
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-success/20 transition-colors">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <span className="font-medium text-sm tracking-wide">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
