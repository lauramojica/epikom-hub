'use client'

import { useEffect, useState, useCallback } from 'react'
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAdmin: false,
  })

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
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
  }, [supabase])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const profile = await fetchProfile(user.id)
        setState({
          user,
          profile,
          isLoading: false,
          isAdmin: profile?.role === 'admin',
        })
      } else {
        setState({
          user: null,
          profile: null,
          isLoading: false,
          isAdmin: false,
        })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            isLoading: false,
            isAdmin: profile?.role === 'admin',
          })
        } else {
          setState({
            user: null,
            profile: null,
            isLoading: false,
            isAdmin: false,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
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
