import { create } from 'zustand'
import api from '@/lib/api'

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
  description?: string
  category_id?: string
  vin?: string
  registration_number?: string
  eligibility_tier?: string
  payment_term_months?: number
  specifications?: Record<string, any>
}

interface VehicleStore {
  vehicles: Vehicle[]
  loading: boolean
  error: string | null
  fetchVehicles: (filters?: {
    vehicleType?: string
    categoryId?: string
    eligibilityTier?: string
    search?: string
    minPrice?: number
    maxPrice?: number
    status?: string
  }) => Promise<void>
  getVehicle: (id: string) => Promise<Vehicle | null>
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  loading: false,
  error: null,

  fetchVehicles: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })

      const response = await api.get(`/vehicles?${params.toString()}`)
      
      if (response.data.success) {
        set({ vehicles: response.data.data.vehicles || [], loading: false })
      } else {
        set({ error: 'Failed to fetch vehicles', loading: false })
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error?.message || 'Failed to fetch vehicles',
        loading: false 
      })
    }
  },

  getVehicle: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get(`/vehicles/${id}`)
      
      if (response.data.success) {
        set({ loading: false })
        return response.data.data.vehicle
      } else {
        set({ error: 'Failed to fetch vehicle', loading: false })
        return null
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error?.message || 'Failed to fetch vehicle',
        loading: false 
      })
      return null
    }
  },
}))

