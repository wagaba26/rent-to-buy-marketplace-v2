'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Navigation from '@/components/Navigation'
import api from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [paymentPlans, setPaymentPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    fetchPaymentPlans()
  }, [router])

  const fetchPaymentPlans = async () => {
    try {
      const userData = localStorage.getItem('user')
      if (!userData) return

      const user = JSON.parse(userData)
      const response = await api.get(`/payments/plans/user/${user.id}`)
      
      if (response.data.success) {
        setPaymentPlans(response.data.data.plans || [])
      }
    } catch (error) {
      console.error('Failed to fetch payment plans:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-carbon-400">Loading...</div>
      </div>
    )
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
            <h1 className="text-display text-5xl font-bold text-carbon-50 mb-2">
              DASHBOARD
            </h1>
            {user && (
              <p className="text-carbon-400 text-lg">
                Welcome back, {user.first_name} {user.last_name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-6">
              <div className="text-carbon-400 text-sm mb-2">ACTIVE PLANS</div>
              <div className="text-display text-3xl font-bold text-volt-500">
                {paymentPlans.filter(p => p.status === 'active').length}
              </div>
            </div>
            <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-6">
              <div className="text-carbon-400 text-sm mb-2">TOTAL INVESTED</div>
              <div className="text-display text-3xl font-bold text-carbon-50">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'UGX',
                  minimumFractionDigits: 0,
                }).format(
                  paymentPlans.reduce((sum, plan) => sum + (plan.total_paid || 0), 0)
                )}
              </div>
            </div>
            <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-6">
              <div className="text-carbon-400 text-sm mb-2">OUTSTANDING</div>
              <div className="text-display text-3xl font-bold text-amber-500">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'UGX',
                  minimumFractionDigits: 0,
                }).format(
                  paymentPlans.reduce((sum, plan) => sum + (plan.outstanding_balance || 0), 0)
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-display text-2xl font-bold text-carbon-200 mb-6">PAYMENT PLANS</h2>
            {paymentPlans.length === 0 ? (
              <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-12 text-center">
                <p className="text-carbon-400 mb-4">You don't have any payment plans yet.</p>
                <button
                  onClick={() => router.push('/vehicles')}
                  className="px-6 py-3 bg-volt-500 text-carbon-950 font-bold hover:bg-volt-400 transition-colors rounded-sm"
                >
                  BROWSE VEHICLES
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentPlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-6 hover:border-volt-500 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="text-display text-xl font-bold text-carbon-50 mb-2">
                          Plan #{plan.id.slice(0, 8)}
                        </div>
                        <div className="text-carbon-400 text-sm">
                          {plan.payment_frequency === 'weekly' ? 'Weekly' : 'Monthly'} payments of{' '}
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0,
                          }).format(plan.installment_amount)}
                        </div>
                        <div className="text-carbon-400 text-sm mt-1">
                          {plan.remaining_installments} of {plan.total_installments} payments remaining
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-carbon-300 text-sm mb-1">Next Payment</div>
                        <div className="text-display text-lg font-bold text-volt-500 mb-2">
                          {plan.next_payment_date ? new Date(plan.next_payment_date).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="inline-block px-3 py-1 bg-volt-500/20 text-volt-500 text-xs font-bold rounded-sm">
                          {plan.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  )
}

