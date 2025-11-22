import { create } from 'zustand'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'payment_reminder' | 'credit_update' | 'upgrade_available'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: number
  actionUrl?: string
  actionLabel?: string
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  getUnreadCount: () => number
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    }
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    })
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id)
      const wasUnread = notification && !notification.read
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    })
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    })
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length
  },
}))

