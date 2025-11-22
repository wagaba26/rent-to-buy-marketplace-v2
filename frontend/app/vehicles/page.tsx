'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'
import VehicleGrid from '@/components/VehicleGrid'
import { useVehicleStore } from '@/store/vehicleStore'

export default function VehiclesPage() {
  const { vehicles, fetchVehicles, loading } = useVehicleStore()
  const [filters, setFilters] = useState({
    vehicleType: '',
    search: '',
  })

  useEffect(() => {
    fetchVehicles(filters)
  }, [fetchVehicles])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchVehicles(newFilters)
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
          <div className="mb-12">
            <h1 className="text-display text-5xl font-bold text-carbon-50 mb-4">
              ALL VEHICLES
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <input
                type="text"
                placeholder="Search by make, model..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="flex-1 px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
              />
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
              >
                <option value="">All Types</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-carbon-400">Loading vehicles...</p>
            </div>
          ) : (
            <VehicleGrid vehicles={vehicles} />
          )}
        </motion.div>
      </div>
    </main>
  )
}

