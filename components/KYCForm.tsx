'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input, Select, Button, Modal } from './ui'
import api from '@/lib/api'

interface KYCFormProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

interface FormData {
  // Personal Information
  firstName: string
  lastName: string
  dateOfBirth: string
  phoneNumber: string
  email: string
  nationalId: string
  address: string
  city: string
  country: string
  
  // Employment Information
  employmentStatus: string
  employerName: string
  jobTitle: string
  monthlyIncome: string
  employmentDuration: string
  
  // Financial Information
  bankName: string
  accountNumber: string
  mobileMoneyProvider: string
  mobileMoneyNumber: string
  
  // Documents
  idDocument: File | null
  proofOfAddress: File | null
  proofOfIncome: File | null
}

const steps = [
  { id: 1, title: 'Personal Information', description: 'Basic details' },
  { id: 2, title: 'Employment Details', description: 'Work information' },
  { id: 3, title: 'Financial Information', description: 'Bank & mobile money' },
  { id: 4, title: 'Document Upload', description: 'Identity verification' },
]

export default function KYCForm({ isOpen, onClose, onComplete }: KYCFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    nationalId: '',
    address: '',
    city: '',
    country: 'Uganda',
    employmentStatus: '',
    employerName: '',
    jobTitle: '',
    monthlyIncome: '',
    employmentDuration: '',
    bankName: '',
    accountNumber: '',
    mobileMoneyProvider: '',
    mobileMoneyNumber: '',
    idDocument: null,
    proofOfAddress: null,
    proofOfIncome: null,
  })
  
  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      if (!formData.nationalId.trim()) newErrors.nationalId = 'National ID is required'
      if (!formData.address.trim()) newErrors.address = 'Address is required'
      if (!formData.city.trim()) newErrors.city = 'City is required'
    } else if (step === 2) {
      if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required'
      if (formData.employmentStatus !== 'unemployed' && !formData.employerName.trim()) {
        newErrors.employerName = 'Employer name is required'
      }
      if (formData.employmentStatus !== 'unemployed' && !formData.monthlyIncome.trim()) {
        newErrors.monthlyIncome = 'Monthly income is required'
      }
    } else if (step === 3) {
      if (!formData.mobileMoneyProvider) {
        newErrors.mobileMoneyProvider = 'Mobile money provider is required'
      }
      if (!formData.mobileMoneyNumber.trim()) {
        newErrors.mobileMoneyNumber = 'Mobile money number is required'
      }
    } else if (step === 4) {
      if (!formData.idDocument) newErrors.idDocument = 'ID document is required'
      if (!formData.proofOfAddress) newErrors.proofOfAddress = 'Proof of address is required'
      if (!formData.proofOfIncome) newErrors.proofOfIncome = 'Proof of income is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    
    setLoading(true)
    try {
      const submitData = new FormData()
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          submitData.append(key, value)
        } else if (value !== null && value !== undefined) {
          submitData.append(key, String(value))
        }
      })
      
      const response = await api.post('/kyc/submit', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (response.data.success) {
        onComplete()
        onClose()
        // Reset form
        setCurrentStep(1)
        setFormData({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          phoneNumber: '',
          email: '',
          nationalId: '',
          address: '',
          city: '',
          country: 'Uganda',
          employmentStatus: '',
          employerName: '',
          jobTitle: '',
          monthlyIncome: '',
          employmentDuration: '',
          bankName: '',
          accountNumber: '',
          mobileMoneyProvider: '',
          mobileMoneyNumber: '',
          idDocument: null,
          proofOfAddress: null,
          proofOfIncome: null,
        })
      }
    } catch (error: any) {
      console.error('KYC submission failed:', error)
      setErrors({
        submit: error.response?.data?.error?.message || 'Submission failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleFileChange = (field: keyof FormData, file: File | null) => {
    updateField(field, file)
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete KYC Verification"
      size="lg"
      closeOnOverlayClick={false}
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    currentStep === step.id
                      ? 'bg-volt-500 text-carbon-950'
                      : currentStep > step.id
                      ? 'bg-volt-500/50 text-carbon-50'
                      : 'bg-carbon-800 text-carbon-400'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-carbon-200' : 'text-carbon-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all duration-300 ${
                    currentStep > step.id ? 'bg-volt-500' : 'bg-carbon-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Form Content */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  error={errors.firstName}
                  required
                  fullWidth
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  error={errors.lastName}
                  required
                  fullWidth
                />
              </div>
              
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                error={errors.dateOfBirth}
                required
                fullWidth
              />
              
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                error={errors.phoneNumber}
                required
                fullWidth
                helperText="Include country code (e.g., +256)"
              />
              
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={errors.email}
                required
                fullWidth
              />
              
              <Input
                label="National ID Number"
                value={formData.nationalId}
                onChange={(e) => updateField('nationalId', e.target.value)}
                error={errors.nationalId}
                required
                fullWidth
              />
              
              <Input
                label="Address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                error={errors.address}
                required
                fullWidth
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  error={errors.city}
                  required
                  fullWidth
                />
                <Input
                  label="Country"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  required
                  fullWidth
                />
              </div>
            </motion.div>
          )}
          
          {/* Step 2: Employment Details */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Select
                label="Employment Status"
                options={[
                  { value: 'employed', label: 'Employed' },
                  { value: 'self_employed', label: 'Self Employed' },
                  { value: 'unemployed', label: 'Unemployed' },
                  { value: 'student', label: 'Student' },
                ]}
                value={formData.employmentStatus}
                onChange={(e) => updateField('employmentStatus', e.target.value)}
                error={errors.employmentStatus}
                required
                fullWidth
              />
              
              {formData.employmentStatus && formData.employmentStatus !== 'unemployed' && (
                <>
                  <Input
                    label="Employer Name"
                    value={formData.employerName}
                    onChange={(e) => updateField('employerName', e.target.value)}
                    error={errors.employerName}
                    required
                    fullWidth
                  />
                  
                  <Input
                    label="Job Title"
                    value={formData.jobTitle}
                    onChange={(e) => updateField('jobTitle', e.target.value)}
                    fullWidth
                  />
                  
                  <Input
                    label="Monthly Income (UGX)"
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) => updateField('monthlyIncome', e.target.value)}
                    error={errors.monthlyIncome}
                    required
                    fullWidth
                  />
                  
                  <Select
                    label="Employment Duration"
                    options={[
                      { value: '<6months', label: 'Less than 6 months' },
                      { value: '6-12months', label: '6-12 months' },
                      { value: '1-2years', label: '1-2 years' },
                      { value: '2-5years', label: '2-5 years' },
                      { value: '5+years', label: '5+ years' },
                    ]}
                    value={formData.employmentDuration}
                    onChange={(e) => updateField('employmentDuration', e.target.value)}
                    fullWidth
                  />
                </>
              )}
            </motion.div>
          )}
          
          {/* Step 3: Financial Information */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input
                label="Bank Name (Optional)"
                value={formData.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
                fullWidth
              />
              
              <Input
                label="Account Number (Optional)"
                value={formData.accountNumber}
                onChange={(e) => updateField('accountNumber', e.target.value)}
                fullWidth
              />
              
              <Select
                label="Mobile Money Provider"
                options={[
                  { value: 'mtn', label: 'MTN Mobile Money' },
                  { value: 'airtel', label: 'Airtel Money' },
                  { value: 'africell', label: 'Africell Money' },
                ]}
                value={formData.mobileMoneyProvider}
                onChange={(e) => updateField('mobileMoneyProvider', e.target.value)}
                error={errors.mobileMoneyProvider}
                required
                fullWidth
              />
              
              <Input
                label="Mobile Money Number"
                type="tel"
                value={formData.mobileMoneyNumber}
                onChange={(e) => updateField('mobileMoneyNumber', e.target.value)}
                error={errors.mobileMoneyNumber}
                required
                fullWidth
                helperText="Enter your registered mobile money number"
              />
            </motion.div>
          )}
          
          {/* Step 4: Document Upload */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-carbon-300 text-sm mb-4">
                Please upload clear, legible copies of the following documents. Supported formats: PDF, JPG, PNG (Max 5MB each).
              </p>
              
              <div>
                <label className="block text-sm font-medium text-carbon-300 mb-2">
                  National ID Document <span className="text-error">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('idDocument', e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:ring-2 focus:ring-volt-500 focus:border-volt-500 transition-all duration-300"
                />
                {errors.idDocument && (
                  <p className="mt-1 text-sm text-error">{errors.idDocument}</p>
                )}
                {formData.idDocument && (
                  <p className="mt-1 text-sm text-carbon-400">Selected: {formData.idDocument.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-carbon-300 mb-2">
                  Proof of Address <span className="text-error">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('proofOfAddress', e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:ring-2 focus:ring-volt-500 focus:border-volt-500 transition-all duration-300"
                />
                {errors.proofOfAddress && (
                  <p className="mt-1 text-sm text-error">{errors.proofOfAddress}</p>
                )}
                {formData.proofOfAddress && (
                  <p className="mt-1 text-sm text-carbon-400">Selected: {formData.proofOfAddress.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-carbon-300 mb-2">
                  Proof of Income <span className="text-error">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('proofOfIncome', e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:ring-2 focus:ring-volt-500 focus:border-volt-500 transition-all duration-300"
                />
                {errors.proofOfIncome && (
                  <p className="mt-1 text-sm text-error">{errors.proofOfIncome}</p>
                )}
                {formData.proofOfIncome && (
                  <p className="mt-1 text-sm text-carbon-400">Selected: {formData.proofOfIncome.name}</p>
                )}
              </div>
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
            onClick={currentStep === 1 ? onClose : handlePrevious}
            variant="outline"
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={handleNext} variant="primary" disabled={loading}>
              Next →
            </Button>
          ) : (
            <Button onClick={handleSubmit} variant="primary" loading={loading}>
              Submit KYC
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

