'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useAuthStore } from '@/store/authStore'
import { Button, Input, Select, Modal, Loading, Card } from './ui'
import { useVehicleStore } from '@/store/vehicleStore'
import api from '@/lib/api'
import KYCForm from './KYCForm'

export default function CheckoutFlow() {
  const { checkout, isCheckoutOpen, updateCheckout, setStep, nextStep, previousStep, closeCheckout, initializeCheckout } = useCheckoutStore()
  const { user, isAuthenticated } = useAuthStore()
  const { getVehicle } = useVehicleStore()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showKYC, setShowKYC] = useState(false)
  const [kycCompleted, setKycCompleted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  useEffect(() => {
    if (checkout.vehicleId && isCheckoutOpen) {
      fetchVehicle()
    }
  }, [checkout.vehicleId, isCheckoutOpen])
  
  const fetchVehicle = async () => {
    if (!checkout.vehicleId) return
    setLoading(true)
    try {
      const data = await getVehicle(checkout.vehicleId)
      setVehicle(data)
    } catch (error) {
      console.error('Failed to fetch vehicle:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (step === 1) {
      // Review step - no validation needed
      return true
    } else if (step === 2) {
      if (!checkout.depositAmount || checkout.depositAmount < (vehicle?.depositAmount || 0)) {
        newErrors.depositAmount = `Minimum deposit is ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'UGX',
          minimumFractionDigits: 0,
        }).format(vehicle?.depositAmount || 0)}`
      }
    } else if (step === 3) {
      if (!checkout.paymentFrequency) {
        newErrors.paymentFrequency = 'Payment frequency is required'
      }
      if (!checkout.paymentTermMonths) {
        newErrors.paymentTermMonths = 'Payment term is required'
      }
    } else if (step === 4) {
      if (!checkout.kycCompleted) {
        newErrors.kyc = 'Please complete KYC verification'
      }
    } else if (step === 5) {
      if (!checkout.selectedPaymentMethod) {
        newErrors.paymentMethod = 'Payment method is required'
      }
      if (checkout.selectedPaymentMethod === 'mobile_money') {
        if (!checkout.mobileMoneyProvider) {
          newErrors.mobileMoneyProvider = 'Mobile money provider is required'
        }
        if (!checkout.phoneNumber) {
          newErrors.phoneNumber = 'Phone number is required'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleNext = () => {
    if (validateStep(checkout.step)) {
      if (checkout.step === 4 && !checkout.kycCompleted) {
        setShowKYC(true)
        return
      }
      if (checkout.step < 5) {
        nextStep()
      } else {
        handleSubmit()
      }
    }
  }
  
  const handleSubmit = async () => {
    if (!validateStep(checkout.step)) return
    
    if (!isAuthenticated) {
      setErrors({ auth: 'Please login to complete checkout' })
      return
    }
    
    setSubmitting(true)
    try {
      const response = await api.post('/payments/checkout', {
        vehicleId: checkout.vehicleId,
        depositAmount: checkout.depositAmount,
        paymentFrequency: checkout.paymentFrequency,
        paymentTermMonths: checkout.paymentTermMonths,
        paymentMethod: checkout.selectedPaymentMethod,
        mobileMoneyProvider: checkout.mobileMoneyProvider,
        phoneNumber: checkout.phoneNumber,
      })
      
      if (response.data.success) {
        // Redirect to success page or dashboard
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      setErrors({
        submit: error.response?.data?.error?.message || 'Checkout failed. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  if (!isCheckoutOpen || !vehicle) return null
  
  const steps = [
    { 
      id: 1, 
      title: 'Review Vehicle', 
      icon: (
        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    { 
      id: 2, 
      title: 'Deposit', 
      icon: (
        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 3, 
      title: 'Payment Plan', 
      icon: (
        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 4, 
      title: 'KYC Verification', 
      icon: (
        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    { 
      id: 5, 
      title: 'Payment', 
      icon: (
        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
  ]
  
  const totalAmount = vehicle?.price || 0
  const depositAmount = checkout.depositAmount || vehicle?.depositAmount || 0
  const remainingAmount = totalAmount - depositAmount
  const monthlyPayment = checkout.paymentTermMonths
    ? remainingAmount / checkout.paymentTermMonths
    : vehicle?.monthlyPayment || 0
  const weeklyPayment = checkout.paymentTermMonths
    ? remainingAmount / (checkout.paymentTermMonths * 4)
    : vehicle?.weeklyPayment || 0
  
  return (
    <>
      <Modal
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
        title="Complete Purchase"
        size="lg"
        closeOnOverlayClick={false}
      >
        {loading ? (
          <Loading text="Loading vehicle details..." />
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                        checkout.step === step.id
                          ? 'bg-primary text-white'
                          : checkout.step > step.id
                          ? 'bg-primary/50 text-white'
                          : 'bg-bg-secondary text-text-tertiary'
                      }`}
                    >
                      {checkout.step > step.id ? (
                        <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="text-white flex items-center justify-center">
                          {typeof step.icon === 'string' ? (
                            <span className="text-sm">{step.icon}</span>
                          ) : (
                            step.icon
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-center font-medium text-text-tertiary max-w-[80px]">
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-all duration-300 ${
                        checkout.step > step.id ? 'bg-primary' : 'bg-bg-secondary'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* Step 1: Review Vehicle */}
              {checkout.step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card variant="outlined">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-bg-secondary rounded-lg overflow-hidden flex-shrink-0 border border-border-primary">
                        {vehicle.images?.[0] ? (
                          <img
                            src={vehicle.images[0]}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-tertiary/50 to-bg-secondary/50">
                            <svg className="icon icon-xl text-text-tertiary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-xl font-bold text-white mb-1">
                          {vehicle.make} {vehicle.model}
                        </h3>
                        <p className="text-text-tertiary text-sm mb-2">
                          {vehicle.year} • {vehicle.vehicle_type}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-text-secondary text-sm">Total Price</span>
                          <span className="font-heading font-bold text-primary">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'UGX',
                              minimumFractionDigits: 0,
                            }).format(vehicle.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
              
              {/* Step 2: Deposit */}
              {checkout.step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Card variant="outlined">
                    <p className="text-carbon-300 text-sm mb-4">
                      Minimum deposit: {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0,
                      }).format(vehicle.depositAmount)}
                    </p>
                    
                    <Input
                      label="Deposit Amount (UGX)"
                      type="number"
                      value={checkout.depositAmount || ''}
                      onChange={(e) => updateCheckout({ depositAmount: Number(e.target.value) })}
                      error={errors.depositAmount}
                      required
                      fullWidth
                      min={vehicle.depositAmount}
                      max={vehicle.price}
                    />
                    
                    <div className="mt-4 p-4 bg-carbon-900/50 rounded border border-carbon-800">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-carbon-300">Total Price</span>
                        <span className="text-carbon-50 font-semibold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(vehicle.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-300">Deposit</span>
                        <span className="text-carbon-50 font-semibold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(depositAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-carbon-800">
                        <span className="text-carbon-300">Remaining Amount</span>
                        <span className="text-volt-500 font-bold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(remainingAmount)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
              
              {/* Step 3: Payment Plan */}
              {checkout.step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Select
                    label="Payment Frequency"
                    options={[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                    ]}
                    value={checkout.paymentFrequency}
                    onChange={(e) => updateCheckout({ paymentFrequency: e.target.value as 'weekly' | 'monthly' })}
                    error={errors.paymentFrequency}
                    required
                    fullWidth
                  />
                  
                  <Select
                    label="Payment Term (Months)"
                    options={[
                      { value: '12', label: '12 months' },
                      { value: '18', label: '18 months' },
                      { value: '24', label: '24 months' },
                      { value: '36', label: '36 months' },
                      { value: '48', label: '48 months' },
                    ]}
                    value={checkout.paymentTermMonths?.toString() || ''}
                    onChange={(e) => updateCheckout({ paymentTermMonths: Number(e.target.value) })}
                    error={errors.paymentTermMonths}
                    required
                    fullWidth
                  />
                  
                  {checkout.paymentTermMonths && (
                    <Card variant="outlined">
                      <h4 className="text-display font-bold text-carbon-50 mb-4">Payment Schedule</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-carbon-300">
                            {checkout.paymentFrequency === 'weekly' ? 'Weekly' : 'Monthly'} Payment
                          </span>
                          <span className="text-volt-500 font-bold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'UGX',
                              minimumFractionDigits: 0,
                            }).format(checkout.paymentFrequency === 'weekly' ? weeklyPayment : monthlyPayment)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-carbon-300">Total Payments</span>
                          <span className="text-carbon-50 font-semibold">
                            {checkout.paymentFrequency === 'weekly'
                              ? checkout.paymentTermMonths * 4
                              : checkout.paymentTermMonths}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-3 border-t border-carbon-800">
                          <span className="text-carbon-300">Total Amount</span>
                          <span className="text-display text-lg font-bold text-carbon-50">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'UGX',
                              minimumFractionDigits: 0,
                            }).format(
                              depositAmount +
                              (checkout.paymentFrequency === 'weekly'
                                ? weeklyPayment * checkout.paymentTermMonths * 4
                                : monthlyPayment * checkout.paymentTermMonths)
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
              
              {/* Step 4: KYC Verification */}
              {checkout.step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {checkout.kycCompleted ? (
                    <Card variant="outlined">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                          <svg className="icon icon-sm text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-success mb-1">
                            KYC Verification Complete
                          </h4>
                          <p className="text-text-secondary text-sm">
                            Your identity has been verified. You can proceed to payment.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card variant="outlined">
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mb-4 mx-auto">
                          <svg className="icon icon-lg text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <h4 className="font-heading font-bold text-white mb-2">
                          KYC Verification Required
                        </h4>
                        <p className="text-text-secondary text-sm mb-6">
                          Please complete KYC verification to proceed with your purchase.
                        </p>
                        <Button onClick={() => setShowKYC(true)} variant="primary">
                          Start KYC Verification
                        </Button>
                        {errors.kyc && (
                          <p className="mt-4 text-sm text-error">{errors.kyc}</p>
                        )}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}
              
              {/* Step 5: Payment */}
              {checkout.step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Select
                    label="Payment Method"
                    options={[
                      { value: 'mobile_money', label: 'Mobile Money' },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                    ]}
                    value={checkout.selectedPaymentMethod || ''}
                    onChange={(e) => updateCheckout({ selectedPaymentMethod: e.target.value as 'mobile_money' | 'bank_transfer' })}
                    error={errors.paymentMethod}
                    required
                    fullWidth
                  />
                  
                  {checkout.selectedPaymentMethod === 'mobile_money' && (
                    <>
                      <Select
                        label="Mobile Money Provider"
                        options={[
                          { value: 'mtn', label: 'MTN Mobile Money' },
                          { value: 'airtel', label: 'Airtel Money' },
                          { value: 'africell', label: 'Africell Money' },
                        ]}
                        value={checkout.mobileMoneyProvider || ''}
                        onChange={(e) => updateCheckout({ mobileMoneyProvider: e.target.value as 'mtn' | 'airtel' | 'africell' })}
                        error={errors.mobileMoneyProvider}
                        required
                        fullWidth
                      />
                      
                      <Input
                        label="Phone Number"
                        type="tel"
                        value={checkout.phoneNumber || ''}
                        onChange={(e) => updateCheckout({ phoneNumber: e.target.value })}
                        error={errors.phoneNumber}
                        required
                        fullWidth
                        placeholder="+256..."
                      />
                    </>
                  )}
                  
                  <Card variant="outlined">
                    <h4 className="text-display font-bold text-carbon-50 mb-4">Order Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-carbon-300">Vehicle</span>
                        <span className="text-carbon-50">
                          {vehicle.make} {vehicle.model}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-carbon-300">Deposit</span>
                        <span className="text-carbon-50">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(depositAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-carbon-800">
                        <span className="text-carbon-300">Total Amount</span>
                        <span className="text-display font-bold text-volt-500">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(depositAmount)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
            
            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-error/10 border border-error rounded-sm text-error text-sm"
              >
                {errors.submit}
              </motion.div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-carbon-800">
              <Button
                onClick={checkout.step === 1 ? closeCheckout : previousStep}
                variant="outline"
                disabled={submitting}
              >
                {checkout.step === 1 ? 'Cancel' : '← Previous'}
              </Button>
              
              {checkout.step < 5 ? (
                <Button onClick={handleNext} variant="primary" disabled={submitting}>
                  Next →
                </Button>
              ) : (
                <Button onClick={handleSubmit} variant="primary" loading={submitting}>
                  Complete Purchase
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
      
      {/* KYC Modal */}
      <KYCForm
        isOpen={showKYC}
        onClose={() => setShowKYC(false)}
        onComplete={() => {
          setKycCompleted(true)
          updateCheckout({ kycCompleted: true })
          setShowKYC(false)
        }}
      />
    </>
  )
}

