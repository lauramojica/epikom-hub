import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Debe ser YYYY-MM-DD");

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Debe ser HH:MM o HH:MM:SS");

export const taskSchema = z.object({
  id_externo: z.string().optional(),
  clientes: z.array(z.string().min(1)).min(1, "Al menos un cliente"),
  asignado_a: z.string().min(1, "asignado_a es requerido"),
  titulo: z.string().min(1),
  descripcion: z.string().optional().default(""),
  tipo: z.string().min(1),
  fecha: dateString,
  hora: timeString.optional(),
  prioridad: z.enum(["HIGH", "MEDIUM", "LOW"]),
  contexto: z.string().optional(),
  origen_notion: z.string().url().optional(),
});

export const weekUploadSchema = z.object({
  semana_inicio: dateString,
  semana_fin: dateString,
  generado_por: z.string().optional(),
  generado_at: z.string().optional(),
  prioridades: z.array(z.string()).default([]),
  deadlines: z
    .array(z.object({ fecha: dateString, entregable: z.string() }))
    .default([]),
  rotacion_national: z.record(z.string(), z.string()).optional(),
  notas: z.string().optional(),
  tareas: z.array(taskSchema).min(1, "Necesita al menos una tarea"),
});

export type WeekUpload = z.infer<typeof weekUploadSchema>;
export type TaskUpload = z.infer<typeof taskSchema>;
