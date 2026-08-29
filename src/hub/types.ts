export type Channel = 'Instagram' | 'Facebook' | 'FB + IG' | 'TikTok' | 'LinkedIn' | 'YouTube' | 'Email';
export type PostFormat = 'reel' | 'carrusel' | 'story' | 'imagen' | 'video' | 'foto' | 'texto' | 'evento' | 'shopper' | 'email';
export type PostStatus = 'idea' | 'creation' | 'design' | 'review' | 'approved' | 'scheduled' | 'published';
export type ProjectPhase = 'discovery' | 'strategy' | 'production' | 'review' | 'launch' | 'reporting';
export type DeliverableStatus = 'pending' | 'in-review' | 'approved' | 'rejected';
export type UserRole = 'superadmin' | 'admin' | 'crew' | 'client';
export type NotifType = 'alert' | 'approval' | 'mention' | 'publish' | 'system';
export type UserStatus = 'active' | 'away' | 'offline';

export interface ContentPost {
  id: string;
  clientId: string;
  title: string;
  channel: Channel;
  format: PostFormat;
  angle: string;
  copy: string;
  hashtags: string[];
  brand: string;
  product: string;
  assigneeId: string;
  campaign: string;
  status: PostStatus;
  scheduledDate: string;
  publishedDate?: string;
  boostBudget?: number;
  actualSpend?: number;
  reach?: number;
  notes: string;
  attachedFiles?: AttachedFile[];
}

export interface Deliverable {
  id: string;
  title: string;
  status: DeliverableStatus;
  rejectionReason?: string;
  dueDate: string;
  timeSpent: number;
  comments: string[];
  attachedFiles?: AttachedFile[];
}

export interface PhaseData {
  key: ProjectPhase;
  label: string;
  completedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  currentPhase: ProjectPhase;
  phases: PhaseData[];
  deliverables: Deliverable[];
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
  color: string;
  status: 'active' | 'paused' | 'completed';
}

export interface ClientContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface ClientInteraction {
  id: string;
  date: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  notes: string;
  by: string;
}

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  name: string;
  weight: string;
  usage: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  email: string;
  phone: string;
  initials: string;
  color: string;
  language: string;
  timezone: string;
  brandRules: {
    bannedWords: string[];
    guidelines: string;
    tone: string;
    colors: BrandColor[];
    fonts: BrandFont[];
    logoUrl?: string;
  };
  contacts: ClientContact[];
  interactions: ClientInteraction[];
  portalAccess: boolean;
  notifyEmail: boolean;
  projectIds: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  initials: string;
  color: string;
  assignedClientIds: string[];
  alertThresholdDays: number;
  emailNotifications: boolean;
  status: UserStatus;
  joinDate: string;
  skills: string[];
  streak?: number;
}

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  postId?: string;
  projectId?: string;
  clientId?: string;
}

export type View = 'myweek' | 'calendar' | 'projects' | 'clients' | 'analytics' | 'notifications' | 'roles' | 'settings' | 'documents';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  clientId: string;
  projectId?: string;
  postId?: string;
  category: 'brief' | 'arte' | 'contrato' | 'reporte' | 'referencia' | 'otro';
  notes: string;
}
