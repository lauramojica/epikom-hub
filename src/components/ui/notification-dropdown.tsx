'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useNotifications, getNotificationIcon, Notification } from '@/hooks/useNotifications'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Loader2,
} from 'lucide-react'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    if (notification.link) {
      setIsOpen(false)
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = ['primary', 'secondary', 'amber', 'blue'] as const
    return colors[index % colors.length]
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-border hover:text-foreground transition-all"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-background-card rounded-2xl shadow-lg border border-border overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground">Notificaciones</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} sin leer
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="gap-1.5 text-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`group p-4 hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-primary-lighter' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon or Avatar */}
                      <div className="flex-shrink-0">
                        {notification.actor ? (
                          <Avatar size="sm">
                            <AvatarImage src={notification.actor.avatar_url || ''} />
                            <AvatarFallback variant={getAvatarColor(index)}>
                              {getInitials(notification.actor.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            onClick={() => handleNotificationClick(notification)}
                            className="block"
                          >
                            <p className="font-medium text-sm text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </Link>
                        ) : (
                          <>
                            <p className="font-medium text-sm text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="w-7 h-7 rounded-lg hover:bg-primary-light hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                            title="Marcar como leída"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="w-7 h-7 rounded-lg hover:bg-error-light hover:text-error flex items-center justify-center text-muted-foreground transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm text-primary hover:underline"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
