'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: 'admin' | 'client'
  company_name: string | null
  language: 'es' | 'en'
  notification_preferences: Record<string, boolean>
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAdmin: boolean
}

// Get singleton client
const supabase = createClient()

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAdmin: false,
  })

  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          return null
        }
        return data
      } catch (err) {
        console.error('Profile fetch error:', err)
        return null
      }
    }

    const initializeAuth = async () => {
      try {
        // Use getSession first - it's faster and uses local storage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (isMounted) {
            setState({ user: null, profile: null, isLoading: false, isAdmin: false })
          }
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (isMounted) {
            setState({
              user: session.user,
              profile,
              isLoading: false,
              isAdmin: profile?.role === 'admin',
            })
          }
        } else {
          if (isMounted) {
            setState({ user: null, profile: null, isLoading: false, isAdmin: false })
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (isMounted) {
          setState({ user: null, profile: null, isLoading: false, isAdmin: false })
        }
      }
    }

    // Timeout safety - if auth takes more than 5 seconds, stop loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setState(prev => {
          if (prev.isLoading) {
            console.warn('Auth timeout - stopping loading state')
            return { ...prev, isLoading: false }
          }
          return prev
        })
      }
    }, 5000)

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          setState({ user: null, profile: null, isLoading: false, isAdmin: false })
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (isMounted) {
            setState({
              user: session.user,
              profile,
              isLoading: false,
              isAdmin: profile?.role === 'admin',
            })
          }
        } else {
          if (isMounted) {
            setState({ user: null, profile: null, isLoading: false, isAdmin: false })
          }
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - supabase is now a singleton

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }))
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
    return { data, error }
  }

  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'client' = 'client') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setState({ user: null, profile: null, isLoading: false, isAdmin: false })
    }
    return { error }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.user) return { error: 'No user logged in' }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id)
      .select()
      .single()

    if (!error && data) {
      setState(prev => ({
        ...prev,
        profile: data,
        isAdmin: data.role === 'admin',
      }))
    }

    return { data, error }
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}
