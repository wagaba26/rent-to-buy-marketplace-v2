'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import api from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/register', formData)

      if (response.data.success && response.data.data.token) {
        localStorage.setItem('auth_token', response.data.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        router.push('/dashboard')
      } else {
        setError('Registration failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <div className="pt-32 pb-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="bg-carbon-900/50 backdrop-blur-sm border border-carbon-800 rounded-lg p-8">
            <h1 className="text-display text-4xl font-bold text-carbon-50 mb-2">REGISTER</h1>
            <p className="text-carbon-400 mb-8">Create your account to get started</p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-carbon-300 text-sm font-medium mb-2">
                    FIRST NAME
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-carbon-300 text-sm font-medium mb-2">
                    LAST NAME
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-carbon-300 text-sm font-medium mb-2">
                  EMAIL
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-carbon-300 text-sm font-medium mb-2">
                  PHONE
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
                  placeholder="+256700000000"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-carbon-300 text-sm font-medium mb-2">
                  PASSWORD
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-carbon-950 border border-carbon-700 rounded-sm text-carbon-50 focus:outline-none focus:border-volt-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 bg-volt-500 text-carbon-950 font-bold text-lg hover:bg-volt-400 transition-all duration-300 rounded-sm shadow-lg hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-volt-500 hover:text-volt-400 text-sm font-medium">
                Already have an account? Login →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

