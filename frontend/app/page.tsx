'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import VehicleGrid from '@/components/VehicleGrid'
import Hero from '@/components/Hero'
import { useVehicleStore } from '@/store/vehicleStore'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { vehicles, fetchVehicles } = useVehicleStore()

  useEffect(() => {
    setMounted(true)
    fetchVehicles()
  }, [fetchVehicles])

  if (!mounted) {
    return null
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="container py-20"
      >
        <div className="mb-12">
          <h2 className="text-display text-4xl mb-4 text-volt-500">
            AVAILABLE VEHICLES
          </h2>
          <p className="text-carbon-300 text-lg max-w-2xl">
            Browse our curated selection of vehicles available for rent-to-own.
            Each vehicle comes with flexible payment plans tailored to your credit profile.
          </p>
        </div>
        <VehicleGrid vehicles={vehicles} />
      </motion.section>
    </main>
  )
}

