'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

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
  eligibility_tier?: string
}

interface VehicleGridProps {
  vehicles: Vehicle[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusColors: Record<string, string> = {
  available: 'bg-success/10 text-success border-success/20',
  reserved: 'bg-warning/10 text-warning border-warning/20',
  rented: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
  sold: 'bg-gray-600/10 text-gray-400 border-gray-600/20',
  maintenance: 'bg-error/10 text-error border-error/20',
}

export default function VehicleGrid({ vehicles }: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 mx-auto mb-6 bg-bg-secondary rounded-full flex items-center justify-center border border-border-primary">
          <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="font-heading text-2xl font-bold text-white mb-3">
          No vehicles available
        </h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Check back soon for new listings! We update our inventory daily.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {vehicles.map((vehicle, index) => (
        <motion.div
          key={vehicle.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.5 }}
        >
          <Link href={`/vehicles/${vehicle.id}`}>
            <div className="group relative h-full bg-bg-secondary/40 backdrop-blur-md border border-border-primary rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
              {/* Vehicle Image */}
              <div className="relative h-64 bg-bg-tertiary overflow-hidden">
                {vehicle.images && vehicle.images.length > 0 ? (
                  <>
                    <img
                      src={vehicle.images[0]}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent opacity-80" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                    <svg className="w-12 h-12 text-text-tertiary/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-lg ${statusColors[vehicle.status as keyof typeof statusColors] || statusColors.available}`}>
                  {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                </div>

                {/* Eligibility Tier Badge */}
                {vehicle.eligibility_tier && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-bg-primary/80 text-white rounded-full text-xs font-bold border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    {vehicle.eligibility_tier.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Vehicle Info */}
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-heading text-xl font-bold text-white mb-2 group-hover:text-primary-light transition-colors line-clamp-1">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
                      {vehicle.year}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                    <span>{vehicle.vehicle_type}</span>
                    {vehicle.mileage && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                        <span>{vehicle.mileage.toLocaleString()} km</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Pricing Info */}
                <div className="space-y-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">Total Price</span>
                    <span className="font-heading font-bold text-lg text-white">
                      {formatCurrency(vehicle.price)}
                    </span>
                  </div>

                  <div className="h-px w-full bg-white/5" />

                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">Deposit</span>
                    <span className="font-semibold text-primary-light">
                      {formatCurrency(vehicle.deposit_amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-sm">
                      {vehicle.payment_frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                    </span>
                    <span className="font-bold text-white">
                      {formatCurrency(
                        vehicle.payment_frequency === 'weekly'
                          ? vehicle.weekly_payment || 0
                          : vehicle.monthly_payment || 0
                      )}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-primary-light text-sm font-bold group-hover:text-primary transition-colors">
                    View Details
                  </span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <svg
                      className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
