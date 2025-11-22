import { create } from 'zustand'

export interface CheckoutState {
  vehicleId: string | null
  depositAmount: number | null
  paymentFrequency: 'weekly' | 'monthly'
  paymentTermMonths: number | null
  selectedPaymentMethod: 'mobile_money' | 'bank_transfer' | null
  mobileMoneyProvider: 'mtn' | 'airtel' | 'africell' | null
  phoneNumber: string | null
  kycCompleted: boolean
  step: number // 1: Review, 2: Deposit, 3: Payment Plan, 4: KYC, 5: Payment
}

interface CheckoutStore {
  checkout: CheckoutState
  isCheckoutOpen: boolean
  
  // Actions
  initializeCheckout: (vehicleId: string) => void
  updateCheckout: (updates: Partial<CheckoutState>) => void
  setStep: (step: number) => void
  nextStep: () => void
  previousStep: () => void
  resetCheckout: () => void
  openCheckout: () => void
  closeCheckout: () => void
}

const defaultCheckout: CheckoutState = {
  vehicleId: null,
  depositAmount: null,
  paymentFrequency: 'monthly',
  paymentTermMonths: null,
  selectedPaymentMethod: null,
  mobileMoneyProvider: null,
  phoneNumber: null,
  kycCompleted: false,
  step: 1,
}

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  checkout: defaultCheckout,
  isCheckoutOpen: false,

  initializeCheckout: (vehicleId) => {
    set({
      checkout: {
        ...defaultCheckout,
        vehicleId,
        step: 1,
      },
      isCheckoutOpen: true,
    })
  },

  updateCheckout: (updates) => {
    set((state) => ({
      checkout: {
        ...state.checkout,
        ...updates,
      },
    }))
  },

  setStep: (step) => {
    set((state) => ({
      checkout: {
        ...state.checkout,
        step,
      },
    }))
  },

  nextStep: () => {
    const currentStep = get().checkout.step
    if (currentStep < 5) {
      set((state) => ({
        checkout: {
          ...state.checkout,
          step: currentStep + 1,
        },
      }))
    }
  },

  previousStep: () => {
    const currentStep = get().checkout.step
    if (currentStep > 1) {
      set((state) => ({
        checkout: {
          ...state.checkout,
          step: currentStep - 1,
        },
      }))
    }
  },

  resetCheckout: () => {
    set({
      checkout: defaultCheckout,
      isCheckoutOpen: false,
    })
  },

  openCheckout: () => {
    set({ isCheckoutOpen: true })
  },

  closeCheckout: () => {
    set({
      checkout: defaultCheckout,
      isCheckoutOpen: false,
    })
  },
}))

