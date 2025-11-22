'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFilterStore } from '@/store/filterStore'
import { Input, Select, Button } from './ui'
import { useVehicleStore } from '@/store/vehicleStore'

interface VehicleCategory {
  id: string
  name: string
  description?: string
}

export default function VehicleSearchFilter() {
  const { filters, updateFilter, resetFilters, isFilterOpen, closeFilterPanel } = useFilterStore()
  const { fetchVehicles, loading } = useVehicleStore()
  const [categories, setCategories] = useState<VehicleCategory[]>([])
  
  const vehicleTypes = [
    { value: '', label: 'All Types' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'car', label: 'Car' },
    { value: 'van', label: 'Van' },
    { value: 'truck', label: 'Truck' },
  ]
  
  const eligibilityTiers = [
    { value: '', label: 'All Tiers' },
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'luxury', label: 'Luxury' },
  ]
  
  const sortOptions = [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'price', label: 'Price: Low to High' },
    { value: 'deposit', label: 'Deposit: Low to High' },
    { value: 'year', label: 'Year: Newest' },
  ]
  
  useEffect(() => {
    // Fetch categories from API
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/vehicles/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.success ? data.data.categories : [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])
  
  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    updateFilter(key, value)
  }
  
  const handleApplyFilters = () => {
    fetchVehicles(filters as any)
    closeFilterPanel()
  }
  
  const handleReset = () => {
    resetFilters()
    fetchVehicles({})
  }
  
  return (
    <AnimatePresence>
      {isFilterOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-carbon-950/80 backdrop-blur-sm z-40"
            onClick={closeFilterPanel}
          />
          
          {/* Filter Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-96 bg-carbon-900 border-l border-carbon-800 z-50 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-display text-2xl font-bold text-carbon-50">
                  FILTERS
                </h2>
                <button
                  onClick={closeFilterPanel}
                  className="text-carbon-400 hover:text-volt-500 transition-colors p-2"
                  aria-label="Close filters"
                >
                  <svg className="icon icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Search */}
              <div className="mb-6">
                <Input
                  label="Search"
                  placeholder="Make, model, year..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  fullWidth
                />
              </div>
              
              {/* Vehicle Type */}
              <div className="mb-6">
                <Select
                  label="Vehicle Type"
                  options={vehicleTypes}
                  value={filters.vehicleType}
                  onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                  fullWidth
                />
              </div>
              
              {/* Category */}
              {categories.length > 0 && (
                <div className="mb-6">
                  <Select
                    label="Category"
                    options={[
                      { value: '', label: 'All Categories' },
                      ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                    ]}
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    fullWidth
                  />
                </div>
              )}
              
              {/* Eligibility Tier */}
              <div className="mb-6">
                <Select
                  label="Eligibility Tier"
                  options={eligibilityTiers}
                  value={filters.eligibilityTier}
                  onChange={(e) => handleFilterChange('eligibilityTier', e.target.value)}
                  fullWidth
                />
              </div>
              
              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-carbon-300 mb-3">
                  Price Range (UGX)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : null)}
                    fullWidth
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : null)}
                    fullWidth
                  />
                </div>
              </div>
              
              {/* Deposit Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-carbon-300 mb-3">
                  Deposit Range (UGX)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.minDeposit || ''}
                    onChange={(e) => handleFilterChange('minDeposit', e.target.value ? Number(e.target.value) : null)}
                    fullWidth
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={filters.maxDeposit || ''}
                    onChange={(e) => handleFilterChange('maxDeposit', e.target.value ? Number(e.target.value) : null)}
                    fullWidth
                  />
                </div>
              </div>
              
              {/* Sort By */}
              <div className="mb-6">
                <Select
                  label="Sort By"
                  options={sortOptions}
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-')
                    handleFilterChange('sortBy', sortBy)
                    handleFilterChange('sortOrder', sortOrder)
                  }}
                  fullWidth
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-carbon-800">
                <Button
                  onClick={handleApplyFilters}
                  variant="primary"
                  fullWidth
                  loading={loading}
                >
                  APPLY FILTERS
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  fullWidth
                  disabled={loading}
                >
                  RESET
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

