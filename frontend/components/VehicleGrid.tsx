'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { format } from 'date-fns'

interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  vehicle_type: string
  price: number
  deposit_amount: number
  weekly_payment?: number
  monthly_payment?: number
  payment_frequency: string
  images?: string[]
  status: string
  color?: string
  mileage?: number
}

interface VehicleGridProps {
  vehicles: Vehicle[]
}

export default function VehicleGrid({ vehicles }: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-carbon-400 text-lg">No vehicles available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {vehicles.map((vehicle, index) => (
        <motion.div
          key={vehicle.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
        >
          <Link href={`/vehicles/${vehicle.id}`}>
            <div className="group relative bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg overflow-hidden hover:border-volt-500 transition-all duration-300 hover:shadow-glow">
              {/* Vehicle Image Placeholder */}
              <div className="relative h-64 bg-gradient-to-br from-carbon-800 to-carbon-900 overflow-hidden">
                {vehicle.images && vehicle.images.length > 0 ? (
                  <img
                    src={vehicle.images[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-6xl text-carbon-700">🚗</div>
                  </div>
                )}
                <div className="absolute top-4 right-4 px-3 py-1 bg-volt-500 text-carbon-950 text-xs font-bold rounded-sm">
                  {vehicle.status.toUpperCase()}
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-display text-xl font-bold text-carbon-50 mb-1 group-hover:text-volt-500 transition-colors">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-carbon-400 text-sm">{vehicle.year} • {vehicle.vehicle_type}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-400">Price</span>
                    <span className="text-display font-bold text-volt-500">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-400">Deposit</span>
                    <span className="text-carbon-200 font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.deposit_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-carbon-400">
                      {vehicle.payment_frequency === 'weekly' ? 'Weekly' : 'Monthly'} Payment
                    </span>
                    <span className="text-carbon-200 font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.payment_frequency === 'weekly' ? vehicle.weekly_payment || 0 : vehicle.monthly_payment || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-carbon-800">
                  <span className="text-volt-500 text-sm font-bold group-hover:underline">
                    VIEW DETAILS →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

