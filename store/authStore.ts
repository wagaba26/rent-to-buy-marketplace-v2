import { create } from 'zustand'
import api from '@/lib/api'

// Helper to persist state to localStorage
const persistStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  },
  setItem: (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value))
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  },
}

export interface User {
  id: string
  email: string
  role: 'customer' | 'agent' | 'admin'
  firstName?: string
  lastName?: string
  phoneNumber?: string
  status: string
  eligibilityTier?: number
  creditScoreId?: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    role?: 'customer' | 'agent' | 'admin'
  }) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  refreshUser: () => Promise<void>
}

// Load persisted state on initialization
const loadPersistedState = () => {
  const stored = persistStorage.getItem('auth-storage')
  return stored || { user: null, token: null, isAuthenticated: false }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const response = await api.post('/auth/login', { email, password })
          
          if (response.data.success) {
            const { user, token } = response.data.data
            localStorage.setItem('auth_token', token)
            set({
              user,
              token,
              isAuthenticated: true,
              loading: false,
              error: null,
            })
          } else {
            set({
              error: response.data.error?.message || 'Login failed',
              loading: false,
            })
            throw new Error(response.data.error?.message || 'Login failed')
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Login failed. Please check your credentials.'
          set({
            error: errorMessage,
            loading: false,
            isAuthenticated: false,
          })
          throw new Error(errorMessage)
        }
      },

      register: async (data) => {
        set({ loading: true, error: null })
        try {
          const response = await api.post('/auth/register', data)
          
          if (response.data.success) {
            const { user, token } = response.data.data
            localStorage.setItem('auth_token', token)
            const newState = {
              user,
              token,
              isAuthenticated: true,
              loading: false,
              error: null,
            }
            set(newState)
            persistStorage.setItem('auth-storage', {
              user,
              token,
              isAuthenticated: true,
            })
          } else {
            set({
              error: response.data.error?.message || 'Registration failed',
              loading: false,
            })
            throw new Error(response.data.error?.message || 'Registration failed')
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Registration failed. Please try again.'
          set({
            error: errorMessage,
            loading: false,
          })
          throw new Error(errorMessage)
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        persistStorage.removeItem('auth-storage')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      updateUser: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          })
        }
      },

      refreshUser: async () => {
        const token = get().token || localStorage.getItem('auth_token')
        if (!token) return

        try {
          const response = await api.get('/users/me')
          if (response.data.success) {
            const user = response.data.data.user
            set({ user })
            persistStorage.setItem('auth-storage', {
              user,
              token: get().token,
              isAuthenticated: true,
            })
          }
        } catch (error) {
          console.error('Failed to refresh user:', error)
        }
      },
    }))

// Initialize from persisted state
const initialState = loadPersistedState()
if (initialState.user && initialState.token) {
  useAuthStore.setState(initialState)
  
  // Subscribe to changes and persist
  useAuthStore.subscribe((state) => {
    persistStorage.setItem('auth-storage', {
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    })
  })
}

