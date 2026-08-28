import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  // Fetch projects based on role
  let projectsQuery = supabase
    .from('projects')
    .select(`
      *,
      client:profiles!client_id(id, name, email, company_name)
    `)
    .order('created_at', { ascending: false })

  // If not admin, only fetch projects where user is the client
  if (!isAdmin) {
    projectsQuery = projectsQuery.eq('client_id', user.id)
  }

  const { data: projects, error } = await projectsQuery

  if (error) {
    console.error('Error fetching projects:', error)
  }

  // Fetch team members for each project (for admin view)
  const projectsWithTeam = await Promise.all(
    (projects || []).map(async (project) => {
      const { data: team } = await supabase
        .from('project_team')
        .select('user:profiles!user_id(id, name, avatar_url)')
        .eq('project_id', project.id)

      return {
        ...project,
        team: team?.map(t => t.user) || []
      }
    })
  )

  return <DashboardClient projects={projectsWithTeam} isAdmin={isAdmin} />
}
