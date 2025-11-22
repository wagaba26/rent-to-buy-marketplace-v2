'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import VehicleGrid from '@/components/VehicleGrid'
import Hero from '@/components/Hero'
import InstantVehicleAdmin from '@/components/InstantVehicleAdmin'
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
      <main className="min-h-screen">
        <Navigation />
        <div className="container py-20 flex justify-center items-center">
          <div className="text-volt-500">Loading vehicles...</div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="container py-20 flex justify-center items-center">
          <div className="text-red-500 p-4">Error: {error.message}</div>
        </div>
      </main>
    )
  }

  const vehicles: Vehicle[] = data?.vehicles || []

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-display text-4xl text-volt-500">
              AVAILABLE VEHICLES
            </h2>
            {numUsers > 1 && (
              <div className="text-xs text-carbon-400">
                {numUsers} users browsing
              </div>
            )}
          </div>
          <p className="text-carbon-300 text-lg max-w-2xl">
            Browse our curated selection of vehicles available for rent-to-own.
            Each vehicle comes with flexible payment plans tailored to your credit profile.
            <span className="block mt-2 text-sm text-volt-400">
              ✨ Updates in real-time - open another tab to see changes instantly!
            </span>
          </p>
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
      <InstantVehicleAdmin />
    </main>
  )
}
