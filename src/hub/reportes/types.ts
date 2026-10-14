import type { JSONContent } from "@tiptap/react";

export type ColumnType = "text" | "url" | "date" | "number" | "select" | "checkbox" | "person";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface ReportColumn {
  id: string;
  name: string;
  type: ColumnType;
  /** Solo para select */
  options?: SelectOption[];
  /** Solo para date: guarda también la hora */
  withTime?: boolean;
  /** Solo para date: al crear una fila se llena con la fecha/hora actual */
  defaultNow?: boolean;
}

export type CellValue = string | number | boolean | null;

export interface ReportSpace {
  id: string;
  name: string;
  icon: string;
  position: number;
  createdBy: string;
}

export interface SpaceMember {
  spaceId: string;
  userId: string;
  role: "editor" | "viewer";
}

export interface ReportTable {
  id: string;
  spaceId: string;
  name: string;
  icon: string;
  titleLabel: string;
  columns: ReportColumn[];
  groupBy: string | null;
  sortBy: string | null;
  sortDesc: boolean;
  template: JSONContent | null;
  position: number;
}

export interface ReportRow {
  id: string;
  tableId: string;
  title: string;
  values: Record<string, CellValue>;
  content: JSONContent | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export const COLUMN_TYPES: { type: ColumnType; label: string; icon: string }[] = [
  { type: "text", label: "Texto", icon: "Aa" },
  { type: "date", label: "Fecha", icon: "📅" },
  { type: "url", label: "Enlace", icon: "🔗" },
  { type: "number", label: "Número", icon: "#" },
  { type: "select", label: "Selección", icon: "▾" },
  { type: "checkbox", label: "Casilla", icon: "☑" },
  { type: "person", label: "Persona", icon: "👤" },
];

export const OPTION_COLORS = ["#31b498", "#dbfa45", "#e040fb", "#f59e0b", "#60a5fa", "#ef4444", "#a78bfa", "#8b93a1"];

/** Columna "virtual" que representa el título de la fila al ordenar */
export const TITLE_COLUMN = "__title";
