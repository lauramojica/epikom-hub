export type TaskStatus = "pendiente" | "en_progreso" | "completada" | "bloqueada";
export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  task_type: string;
  task_types?: string[];
  priority: TaskPriority;
  status: TaskStatus;
  notion_url: string | null;
  context: string | null;
  completed_at: string | null;
  user_note: string | null;
  assigned_to?: string;
  task_clients: { client_name: string }[];
  task_assignees?: {
    user_id: string;
    is_primary: boolean;
    users: { id: string; name: string; slug: string } | null;
  }[];
};

export type WeekRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  priorities: string[] | null;
  deadlines: { fecha: string; entregable: string }[] | null;
  rotation_national: Record<string, string> | null;
  notes: string | null;
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
  bloqueada: "Bloqueada",
};

// Puerto Rico is UTC-4 year-round. We format dates via Intl with PR timezone.
export const PR_TZ = "America/Puerto_Rico";

export function todayInPR(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

export function formatPrettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-PR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatDayName(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("es-PR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}
