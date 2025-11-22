'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'
import { useVehicleStore } from '@/store/vehicleStore'

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getVehicle } = useVehicleStore()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicle = async () => {
      if (params.id) {
        const data = await getVehicle(params.id as string)
        setVehicle(data)
        setLoading(false)
      }
    }
    fetchVehicle()
  }, [params.id, getVehicle])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-carbon-400">Loading...</div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-carbon-400">Vehicle not found</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="container"
        >
          <button
            onClick={() => router.back()}
            className="mb-8 text-carbon-400 hover:text-volt-500 transition-colors text-sm font-medium"
          >
            ← BACK TO VEHICLES
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image Gallery */}
            <div>
              <div className="relative h-[600px] bg-gradient-to-br from-carbon-800 to-carbon-900 rounded-lg overflow-hidden mb-4">
                {vehicle.images && vehicle.images.length > 0 ? (
                  <img
                    src={vehicle.images[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-9xl text-carbon-700">🚗</div>
                  </div>
                )}
              </div>
              {vehicle.images && vehicle.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {vehicle.images.slice(1, 5).map((img: string, idx: number) => (
                    <div key={idx} className="h-24 bg-carbon-800 rounded overflow-hidden">
                      <img src={img} alt={`${vehicle.make} ${vehicle.model} ${idx + 2}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Details */}
            <div>
              <div className="mb-6">
                <h1 className="text-display text-5xl font-bold text-carbon-50 mb-2">
                  {vehicle.make} {vehicle.model}
                </h1>
                <p className="text-carbon-400 text-lg">
                  {vehicle.year} • {vehicle.vehicle_type} • {vehicle.color || 'N/A'}
                </p>
              </div>

              {vehicle.description && (
                <div className="mb-8">
                  <h2 className="text-display text-xl font-bold text-carbon-200 mb-3">DESCRIPTION</h2>
                  <p className="text-carbon-300 leading-relaxed">{vehicle.description}</p>
                </div>
              )}

              {/* Pricing Card */}
              <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-6 mb-8">
                <h2 className="text-display text-xl font-bold text-volt-500 mb-6">PAYMENT PLAN</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-carbon-800">
                    <span className="text-carbon-300">Total Price</span>
                    <span className="text-display text-2xl font-bold text-carbon-50">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-carbon-300">Deposit Required</span>
                    <span className="text-display text-xl font-bold text-volt-500">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.deposit_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-carbon-300">
                      {vehicle.payment_frequency === 'weekly' ? 'Weekly' : 'Monthly'} Payment
                    </span>
                    <span className="text-display text-xl font-bold text-carbon-50">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.payment_frequency === 'weekly' ? vehicle.weekly_payment || 0 : vehicle.monthly_payment || 0)}
                    </span>
                  </div>
                  {vehicle.payment_term_months && (
                    <div className="flex items-center justify-between">
                      <span className="text-carbon-300">Payment Term</span>
                      <span className="text-carbon-200 font-semibold">
                        {vehicle.payment_term_months} months
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications */}
              <div className="mb-8">
                <h2 className="text-display text-xl font-bold text-carbon-200 mb-4">SPECIFICATIONS</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                    <div className="text-carbon-400 text-sm mb-1">Make</div>
                    <div className="text-carbon-50 font-semibold">{vehicle.make}</div>
                  </div>
                  <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                    <div className="text-carbon-400 text-sm mb-1">Model</div>
                    <div className="text-carbon-50 font-semibold">{vehicle.model}</div>
                  </div>
                  <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                    <div className="text-carbon-400 text-sm mb-1">Year</div>
                    <div className="text-carbon-50 font-semibold">{vehicle.year}</div>
                  </div>
                  <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                    <div className="text-carbon-400 text-sm mb-1">Type</div>
                    <div className="text-carbon-50 font-semibold">{vehicle.vehicle_type}</div>
                  </div>
                  {vehicle.mileage && (
                    <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                      <div className="text-carbon-400 text-sm mb-1">Mileage</div>
                      <div className="text-carbon-50 font-semibold">{vehicle.mileage.toLocaleString()} km</div>
                    </div>
                  )}
                  {vehicle.vin && (
                    <div className="bg-carbon-900/30 p-4 rounded border border-carbon-800">
                      <div className="text-carbon-400 text-sm mb-1">VIN</div>
                      <div className="text-carbon-50 font-semibold font-mono text-xs">{vehicle.vin}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 px-8 py-4 bg-volt-500 text-carbon-950 font-bold text-lg hover:bg-volt-400 transition-all duration-300 rounded-sm shadow-lg hover:shadow-glow">
                  RESERVE NOW
                </button>
                <button className="px-8 py-4 border-2 border-carbon-600 text-carbon-50 font-bold text-lg hover:border-volt-500 hover:text-volt-500 transition-all duration-300 rounded-sm">
                  CHECK ELIGIBILITY
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

