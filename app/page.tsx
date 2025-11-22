'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import VehicleGrid from '@/components/VehicleGrid'
import Hero from '@/components/Hero'
import InstantVehicleAdmin from '@/components/InstantVehicleAdmin'
import Footer from '@/components/Footer'
import { db, vehiclesRoom, type Vehicle } from '@/lib/instant'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  // Use Instant to fetch vehicles in real-time
  const { isLoading, error, data } = db.useQuery({
    vehicles: {
      $: {
        where: {
          status: 'available'
        }
      }
    }
  });

  // Get presence data (users viewing vehicles)
  const { peers } = db.rooms.usePresence(vehiclesRoom);
  const numUsers = 1 + Object.keys(peers).length;

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-bg-primary selection:bg-primary selection:text-white">
        <Navigation />
        <Hero />
        <div className="container py-24 flex flex-col justify-center items-center min-h-[400px]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-text-secondary font-medium mt-6 animate-pulse">Loading vehicles...</p>
        </div>
        <Footer />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-bg-primary selection:bg-primary selection:text-white">
        <Navigation />
        <Hero />
        <div className="container py-24 flex justify-center items-center min-h-[400px]">
          <div className="max-w-md w-full p-8 bg-error/5 border border-error/20 rounded-2xl text-error backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-error/10 rounded-xl">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-white">Error loading vehicles</h3>
                <p className="text-sm text-error/90 leading-relaxed">{error.message}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const vehicles: Vehicle[] = data?.vehicles || []

  return (
    <main className="min-h-screen bg-bg-primary selection:bg-primary selection:text-white overflow-hidden">
      <Navigation />
      <Hero />

      <div className="relative">
        {/* Background Decor */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="container py-20 md:py-32"
        >
          <div className="mb-16 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Live Inventory
                </div>
                <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                  Available <span className="text-gradient">Vehicles</span>
                </h2>
                <p className="text-text-secondary text-lg max-w-2xl leading-relaxed">
                  Browse our curated selection of premium vehicles available for rent-to-own.
                  Flexible plans tailored to your journey.
                </p>
              </div>

              {numUsers > 1 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-bg-tertiary/50 border border-border-primary rounded-full backdrop-blur-sm animate-fade-in">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    <span className="font-bold text-white">{numUsers}</span> people browsing
                  </span>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-border-accent to-transparent opacity-50" />
          </div>

          <VehicleGrid vehicles={vehicles.map(v => ({
            id: v.id,
            make: v.make,
            model: v.model,
            year: v.year,
            vehicle_type: v.vehicleType,
            price: v.price,
            deposit_amount: v.depositAmount,
            weekly_payment: v.weeklyPayment,
            monthly_payment: v.monthlyPayment,
            payment_frequency: v.paymentFrequency || '',
            images: v.images || [],
            status: v.status,
            color: v.color,
            mileage: v.mileage,
            description: v.description,
            category_id: v.categoryId,
            vin: v.vin,
            registration_number: v.registrationNumber,
            eligibility_tier: v.eligibilityTier,
            payment_term_months: v.paymentTermMonths,
            specifications: v.specifications as Record<string, any> | undefined,
          }))} />
        </motion.section>
      </div>

      <InstantVehicleAdmin />
      <Footer />
    </main>
  )
}
