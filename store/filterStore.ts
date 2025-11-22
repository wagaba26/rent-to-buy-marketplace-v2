import { create } from 'zustand'

export interface VehicleFilters {
  search: string
  vehicleType: string
  categoryId: string
  eligibilityTier: string
  minPrice: number | null
  maxPrice: number | null
  minDeposit: number | null
  maxDeposit: number | null
  status: string
  sortBy: 'price' | 'deposit' | 'year' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

interface FilterStore {
  filters: VehicleFilters
  isFilterOpen: boolean
  
  // Actions
  updateFilter: <K extends keyof VehicleFilters>(key: K, value: VehicleFilters[K]) => void
  resetFilters: () => void
  setFilters: (filters: Partial<VehicleFilters>) => void
  toggleFilterPanel: () => void
  openFilterPanel: () => void
  closeFilterPanel: () => void
}

const defaultFilters: VehicleFilters = {
  search: '',
  vehicleType: '',
  categoryId: '',
  eligibilityTier: '',
  minPrice: null,
  maxPrice: null,
  minDeposit: null,
  maxDeposit: null,
  status: 'available',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export const useFilterStore = create<FilterStore>((set) => ({
  filters: defaultFilters,
  isFilterOpen: false,

  updateFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }))
  },

  resetFilters: () => {
    set({ filters: defaultFilters })
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
      },
    }))
  },

  toggleFilterPanel: () => {
    set((state) => ({ isFilterOpen: !state.isFilterOpen }))
  },

  openFilterPanel: () => {
    set({ isFilterOpen: true })
  },

  closeFilterPanel: () => {
    set({ isFilterOpen: false })
  },
}))

