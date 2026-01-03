'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  X,
  LogOut,
  Calendar,
} from 'lucide-react'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('proyectos')
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isAdmin, signOut, isLoading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const sidebarNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Proyectos', href: '/projects', icon: FolderKanban },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  ]

  const tabs = ['proyectos', 'calendario', 'archivos', 'equipo']

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  // Don't block render - middleware already protects routes
  // Just show a simpler loading state in the sidebar/header area
  const userName = profile?.full_name || 'Usuario'
  const userInitials = getInitials(userName)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Slim Sidebar - Desktop */}
      <aside className="hidden lg:flex w-16 bg-background-card border-r border-border flex-col items-center py-4 flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
            <span className="text-white font-bold text-sm">E</span>
          </div>
        </Link>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {sidebarNavigation
            .filter(item => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-primary-light text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={item.name}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              )
            })}
        </nav>

        {/* Bottom icons */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/settings"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title="Configuración"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-error-light hover:text-error transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <Avatar size="sm">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback variant="secondary">
              {isLoading ? '...' : userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </aside>

      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-background-card shadow-md"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-background-card border-r border-border p-6 animate-slide-in">
            <div className="flex items-center gap-3 mb-8 mt-8">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold">E</span>
              </div>
              <div>
                <p className="font-bold text-foreground">Epikom Hub</p>
                <p className="text-xs text-muted-foreground">Gestión de Proyectos</p>
              </div>
            </div>
            <nav className="space-y-1">
              {sidebarNavigation
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        active
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
            </nav>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <Avatar size="sm">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback variant="secondary">
                    {isLoading ? '...' : userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {isLoading ? 'Cargando...' : userName}
                  </p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'Cliente'}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-background-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          {/* Left - Tabs */}
          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Mobile spacer */}
          <div className="md:hidden w-10" />

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-64 h-9 pl-9 pr-4 rounded-lg bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            {/* Notifications */}
            <NotificationDropdown />
            
            {/* New Project Button */}
            {isAdmin && (
              <Link href="/projects/new">
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo</span>
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
