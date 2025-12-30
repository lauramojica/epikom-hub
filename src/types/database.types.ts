export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: 'admin' | 'client'
          company_name: string | null
          language: 'es' | 'en'
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          role?: 'admin' | 'client'
          company_name?: string | null
          language?: 'es' | 'en'
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'admin' | 'client'
          company_name?: string | null
          language?: 'es' | 'en'
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          client_id: string
          status: 'active' | 'on-hold' | 'completed' | 'cancelled'
          progress: number
          start_date: string
          end_date: string
          estimated_hours: number
          language: 'es' | 'en'
          checklist_client: Json
          checklist_epikom: Json
          last_activity_at: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          client_id: string
          status?: 'active' | 'on-hold' | 'completed' | 'cancelled'
          progress?: number
          start_date: string
          end_date: string
          estimated_hours?: number
          language?: 'es' | 'en'
          checklist_client?: Json
          checklist_epikom?: Json
          last_activity_at?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          client_id?: string
          status?: 'active' | 'on-hold' | 'completed' | 'cancelled'
          progress?: number
          start_date?: string
          end_date?: string
          estimated_hours?: number
          language?: 'es' | 'en'
          checklist_client?: Json
          checklist_epikom?: Json
          last_activity_at?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_team: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          assigned_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
          assigned_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          assigned_at?: string
        }
      }
      deliverables: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          due_date: string | null
          status: 'pending' | 'in_review' | 'approved' | 'rejected'
          rejection_reason: string | null
          approved_at: string | null
          approved_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          due_date?: string | null
          status?: 'pending' | 'in_review' | 'approved' | 'rejected'
          rejection_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          due_date?: string | null
          status?: 'pending' | 'in_review' | 'approved' | 'rejected'
          rejection_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          project_id: string
          deliverable_id: string | null
          file_name: string
          file_type: string
          file_size: number
          mime_type: string
          storage_path: string
          version: number
          is_current_version: boolean
          parent_file_id: string | null
          status: 'pending' | 'approved' | 'rejected'
          comments: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          deliverable_id?: string | null
          file_name: string
          file_type: string
          file_size: number
          mime_type: string
          storage_path: string
          version?: number
          is_current_version?: boolean
          parent_file_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          comments?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          deliverable_id?: string | null
          file_name?: string
          file_type?: string
          file_size?: number
          mime_type?: string
          storage_path?: string
          version?: number
          is_current_version?: boolean
          parent_file_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          comments?: string | null
          uploaded_by?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          project_id: string
          deliverable_id: string | null
          parent_id: string | null
          content: string
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          deliverable_id?: string | null
          parent_id?: string | null
          content: string
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          deliverable_id?: string | null
          parent_id?: string | null
          content?: string
          author_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          mentioned_user_id?: string
          notified?: boolean
          created_at?: string
        }
      }
      comment_reads: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          read_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'inactivity' | 'deadline' | 'approval' | 'comment' | 'file' | 'mention'
          priority: 'high' | 'medium' | 'low'
          title: string
          message: string
          project_id: string | null
          deliverable_id: string | null
          comment_id: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'inactivity' | 'deadline' | 'approval' | 'comment' | 'file' | 'mention'
          priority?: 'high' | 'medium' | 'low'
          title: string
          message: string
          project_id?: string | null
          deliverable_id?: string | null
          comment_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'inactivity' | 'deadline' | 'approval' | 'comment' | 'file' | 'mention'
          priority?: 'high' | 'medium' | 'low'
          title?: string
          message?: string
          project_id?: string | null
          deliverable_id?: string | null
          comment_id?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          project_id: string
          user_id: string
          hours: number
          description: string
          entry_date: string
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          hours: number
          description: string
          entry_date: string
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          hours?: number
          description?: string
          entry_date?: string
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      project_timeline: {
        Row: {
          id: string
          project_id: string
          action: string
          description: string
          actor_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          action: string
          description: string
          actor_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          action?: string
          description?: string
          actor_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          recipient_id: string
          recipient_email: string
          type: string
          subject: string
          project_id: string | null
          deliverable_id: string | null
          sent_at: string
          status: 'sent' | 'failed' | 'bounced'
        }
        Insert: {
          id?: string
          recipient_id: string
          recipient_email: string
          type: string
          subject: string
          project_id?: string | null
          deliverable_id?: string | null
          sent_at?: string
          status?: 'sent' | 'failed' | 'bounced'
        }
        Update: {
          id?: string
          recipient_id?: string
          recipient_email?: string
          type?: string
          subject?: string
          project_id?: string | null
          deliverable_id?: string | null
          sent_at?: string
          status?: 'sent' | 'failed' | 'bounced'
        }
      }
    }
    Views: {
      analytics_summary: {
        Row: {
          active_projects: number
          completed_projects: number
          onhold_projects: number
          cancelled_projects: number
          at_risk_projects: number
          avg_completion_days: number
          refreshed_at: string
        }
      }
      analytics_monthly: {
        Row: {
          month: string
          projects_created: number
          projects_completed: number
          avg_progress: number
        }
      }
      analytics_approval_rate: {
        Row: {
          week: string
          approved: number
          rejected: number
          total: number
          approval_percentage: number
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      has_project_access: {
        Args: { project_uuid: string }
        Returns: boolean
      }
      refresh_analytics: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Deliverable = Database['public']['Tables']['deliverables']['Row']
export type FileRecord = Database['public']['Tables']['files']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']

// Extended types with relations
export type ProjectWithClient = Project & {
  client: Profile
}

export type ProjectWithDetails = Project & {
  client: Profile
  team: Profile[]
  deliverables: Deliverable[]
}

export type CommentWithAuthor = Comment & {
  author: Profile
}
