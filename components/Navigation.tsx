'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useFilterStore } from '@/store/filterStore'
import { useRouter, usePathname } from 'next/navigation'
import VehicleSearchFilter from './VehicleSearchFilter'
import NotificationsPanel from './NotificationsPanel'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, isAuthenticated, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { openFilterPanel } = useFilterStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
    setIsOpen(false)
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? 'glass-strong border-b border-border-primary shadow-lg py-2'
            : 'bg-transparent py-4'
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-bg-secondary to-bg-primary border border-border-primary p-2 rounded-xl shadow-lg group-hover:border-primary/50 transition-colors duration-300">
                  <svg className="w-8 h-8 text-primary group-hover:text-primary-light transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="font-heading text-xl font-bold text-white tracking-tight">
                Auto<span className="text-primary">Ladder</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <Link
                href="/vehicles"
                className={`text-sm font-medium transition-all duration-300 relative group ${isActive('/vehicles') ? 'text-primary' : 'text-text-secondary hover:text-white'
                  }`}
              >
                Vehicles
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${isActive('/vehicles') ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    href="/dashboard"
                    className={`text-sm font-medium transition-all duration-300 relative group ${isActive('/dashboard') ? 'text-primary' : 'text-text-secondary hover:text-white'
                      }`}
                  >
                    Dashboard
                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${isActive('/dashboard') ? 'w-full' : 'w-0 group-hover:w-full'
                      }`} />
                  </Link>

                  {(user?.role === 'admin' || user?.role === 'agent') && (
                    <Link
                      href={user?.role === 'admin' ? '/admin' : '/agent'}
                      className={`text-sm font-medium transition-all duration-300 relative group ${isActive(user?.role === 'admin' ? '/admin' : '/agent') ? 'text-primary' : 'text-text-secondary hover:text-white'
                        }`}
                    >
                      {user?.role === 'admin' ? 'Admin' : 'Agent'}
                      <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${isActive(user?.role === 'admin' ? '/admin' : '/agent') ? 'w-full' : 'w-0 group-hover:w-full'
                        }`} />
                    </Link>
                  )}

                  <button
                    onClick={openFilterPanel}
                    className="text-sm font-medium text-text-secondary hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                  </button>

                  <div className="flex items-center pl-4 border-l border-border-primary">
                    <NotificationsPanel />
                  </div>

                  <div className="flex items-center gap-4 pl-4 border-l border-border-primary">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark p-[1px] shadow-glow">
                        <div className="w-full h-full rounded-full bg-bg-secondary flex items-center justify-center text-white text-sm font-bold">
                          {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                        </div>
                      </div>
                      <div className="hidden xl:block">
                        <p className="text-sm font-medium text-white leading-none mb-1">
                          {user?.firstName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-primary-light font-medium capitalize leading-none">
                          {user?.role || 'Customer'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-text-secondary hover:text-error transition-colors rounded-lg hover:bg-error/10"
                      title="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {!isAuthenticated && (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-text-secondary hover:text-white transition-colors px-4 py-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden glass-strong border-t border-border-primary overflow-hidden"
            >
              <div className="container mx-auto px-4 py-6 space-y-2">
                <Link
                  href="/vehicles"
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive('/vehicles')
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-white/5 hover:text-white'
                    }`}
                >
                  Vehicles
                </Link>

                {isAuthenticated && (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive('/dashboard')
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      Dashboard
                    </Link>

                    {(user?.role === 'admin' || user?.role === 'agent') && (
                      <Link
                        href={user?.role === 'admin' ? '/admin' : '/agent'}
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive(user?.role === 'admin' ? '/admin' : '/agent')
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                      >
                        {user?.role === 'admin' ? 'Admin' : 'Agent'}
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        openFilterPanel()
                        setIsOpen(false)
                      }}
                      className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-text-secondary hover:bg-white/5 hover:text-white transition-all"
                    >
                      Filters
                    </button>

                    <div className="my-4 border-t border-border-primary" />

                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark p-[1px]">
                        <div className="w-full h-full rounded-full bg-bg-secondary flex items-center justify-center text-white font-bold">
                          {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user?.firstName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-primary-light capitalize">
                          {user?.role || 'Customer'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 rounded-xl text-base font-medium text-error hover:bg-error/10 transition-all text-left flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </>
                )}

                {!isAuthenticated && (
                  <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-border-primary">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center py-3 text-text-secondary hover:text-white font-medium transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Filter Panel */}
      <VehicleSearchFilter />
    </>
  )
}
