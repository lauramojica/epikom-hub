'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  company: string | null
  address: string | null
  city: string | null
  country: string | null
  website: string | null
  avatar_url: string | null
  notification_preferences: {
    email: boolean
    sms: boolean
    whatsapp: boolean
  }
  internal_notes: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
  // Computed fields from view
  active_projects?: number
  total_projects?: number
  last_project_activity?: string | null
}

export interface ClientInput {
  name: string
  email: string
  phone?: string | null
  whatsapp?: string | null
  company?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  avatar_url?: string | null
  notification_preferences?: {
    email: boolean
    sms: boolean
    whatsapp: boolean
  }
  internal_notes?: string | null
  status?: 'active' | 'inactive' | 'archived'
}

const supabase = createClient()

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all clients with stats
  const fetchClients = useCallback(async (search?: string, status?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('clients_with_stats')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
      }

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setClients(data || [])
    } catch (err: any) {
      console.error('Error fetching clients:', err)
      setError(err.message)
      
      // Fallback to regular table if view doesn't exist
      try {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
        setClients(data || [])
      } catch {
        setClients([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get single client by ID
  const getClient = async (id: string): Promise<Client | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      console.error('Error getting client:', err)
      return null
    }
  }

  // Get client with projects
  const getClientWithProjects = async (id: string) => {
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (clientError) throw clientError

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          status,
          progress,
          project_type,
          start_date,
          end_date,
          created_at
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      const { data: interactions, error: interactionsError } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(20)

      return {
        client,
        projects: projects || [],
        interactions: interactions || []
      }
    } catch (err: any) {
      console.error('Error getting client with projects:', err)
      return null
    }
  }

  // Create client
  const createClient = async (input: ClientInput): Promise<{ data: Client | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...input,
          notification_preferences: input.notification_preferences || {
            email: true,
            sms: false,
            whatsapp: false
          }
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setClients(prev => [data, ...prev])

      return { data, error: null }
    } catch (err: any) {
      console.error('Error creating client:', err)
      return { data: null, error: err.message }
    }
  }

  // Update client
  const updateClient = async (id: string, input: Partial<ClientInput>): Promise<{ data: Client | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))

      return { data, error: null }
    } catch (err: any) {
      console.error('Error updating client:', err)
      return { data: null, error: err.message }
    }
  }

  // Delete client
  const deleteClient = async (id: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      setClients(prev => prev.filter(c => c.id !== id))

      return { error: null }
    } catch (err: any) {
      console.error('Error deleting client:', err)
      return { error: err.message }
    }
  }

  // Archive client
  const archiveClient = async (id: string): Promise<{ error: string | null }> => {
    return updateClient(id, { status: 'archived' }).then(r => ({ error: r.error }))
  }

  // Add interaction
  const addInteraction = async (
    clientId: string,
    type: string,
    title: string,
    description?: string,
    projectId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('client_interactions')
        .insert({
          client_id: clientId,
          interaction_type: type,
          title,
          description,
          project_id: projectId,
          logged_by: user?.id
        })

      if (error) throw error
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return {
    clients,
    isLoading,
    error,
    fetchClients,
    getClient,
    getClientWithProjects,
    createClient,
    updateClient,
    deleteClient,
    archiveClient,
    addInteraction,
  }
}

// Helper to format phone number
export function formatPhone(phone: string | null): string {
  if (!phone) return ''
  // Remove non-digits
  const digits = phone.replace(/\D/g, '')
  // Format as (XXX) XXX-XXXX or similar
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}
