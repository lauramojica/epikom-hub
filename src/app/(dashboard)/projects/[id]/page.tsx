import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProjectDetailClient from './project-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch project with related data
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:profiles!client_id(id, full_name, email, company_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch team members
  const { data: team } = await supabase
    .from('project_team')
    .select('user:profiles!user_id(id, full_name, email, avatar_url)')
    .eq('project_id', id)

  // Fetch deliverables
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch timeline
  const { data: timeline } = await supabase
    .from('project_timeline')
    .select(`
      *,
      actor:profiles!actor_id(full_name, avatar_url)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <ProjectDetailClient
      project={{
        ...project,
        team: team?.map(t => t.user) || [],
        deliverables: deliverables || [],
        timeline: timeline || [],
      }}
      isAdmin={isAdmin}
    />
  )
}
