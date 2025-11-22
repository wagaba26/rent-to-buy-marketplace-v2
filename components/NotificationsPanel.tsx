'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/notificationStore'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Button } from './ui'

export default function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore()
  
  const [isOpen, setIsOpen] = useState(false)
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'payment_reminder':
        return '💰'
      case 'credit_update':
        return '📈'
      case 'upgrade_available':
        return '⬆️'
      default:
        return 'ℹ️'
    }
  }
  
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-volt-500 bg-volt-500/10'
      case 'warning':
        return 'border-amber-500 bg-amber-500/10'
      case 'error':
        return 'border-error bg-error/10'
      case 'payment_reminder':
        return 'border-amber-400 bg-amber-400/10'
      case 'credit_update':
        return 'border-volt-400 bg-volt-400/10'
      case 'upgrade_available':
        return 'border-volt-500 bg-volt-500/10'
      default:
        return 'border-carbon-700 bg-carbon-900/50'
    }
  }
  
  return (
    <>
      {/* Notifications Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative text-text-secondary hover:text-primary-light transition-colors p-2 -m-2"
        aria-label="Notifications"
      >
        <svg className="icon icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>
      
      {/* Notifications Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-carbon-950/80 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full md:w-96 bg-carbon-900 border-l border-carbon-800 z-50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold text-white">
                    Notifications
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-text-tertiary hover:text-primary-light transition-colors p-1.5 -mr-1.5"
                    aria-label="Close notifications"
                  >
                    <svg className="icon icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={markAllAsRead}
                      variant="ghost"
                      size="sm"
                      disabled={unreadCount === 0}
                    >
                      Mark all read
                    </Button>
                    <Button
                      onClick={clearAll}
                      variant="ghost"
                      size="sm"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-11 h-11 mb-4 bg-bg-secondary rounded-full flex items-center justify-center">
                      <svg className="icon icon-sm text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-text-secondary text-base mb-1">No notifications</p>
                    <p className="text-text-tertiary text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                        notification.read
                          ? 'border-carbon-800 bg-carbon-900/30'
                          : getNotificationColor(notification.type)
                      } hover:border-volt-500`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                        if (notification.actionUrl) {
                          setIsOpen(false)
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-bg-secondary rounded-lg">
                          <span className="text-base">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-bold text-carbon-50">
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-volt-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-carbon-300 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-carbon-500">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            {notification.actionUrl && notification.actionLabel && (
                              <Link
                                href={notification.actionUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-volt-500 hover:text-volt-400 font-medium"
                              >
                                {notification.actionLabel} →
                              </Link>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                          className="text-text-tertiary hover:text-error transition-colors p-1 -mr-1"
                          aria-label="Remove notification"
                        >
                          <svg className="icon icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

