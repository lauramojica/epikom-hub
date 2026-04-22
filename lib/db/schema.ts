import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    phone: text("phone"),
    notificationPreferences: jsonb("notification_preferences").default({
      sms: true,
      push: true,
      email: true,
    }),
    pushSubscription: jsonb("push_subscription"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    slugIdx: index("idx_users_slug").on(t.slug),
    roleIdx: index("idx_users_role").on(t.role),
  })
);

export const weeks = pgTable(
  "weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekStartDate: date("week_start_date").notNull().unique(),
    weekEndDate: date("week_end_date").notNull(),
    priorities: jsonb("priorities"),
    deadlines: jsonb("deadlines"),
    rotationNational: jsonb("rotation_national"),
    notes: text("notes"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    rawFile: jsonb("raw_file"),
  },
  (t) => ({
    startIdx: index("idx_weeks_start").on(t.weekStartDate),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id"),
    weekId: uuid("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    assignedTo: uuid("assigned_to")
      .notNull()
      .references(() => users.id),
    dueDate: date("due_date").notNull(),
    taskType: text("task_type").notNull(),
    priority: text("priority").notNull(),
    status: text("status").default("pendiente"),
    notionUrl: text("notion_url"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    userNote: text("user_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    assignedDueIdx: index("idx_tasks_assigned_due").on(t.assignedTo, t.dueDate),
    weekIdx: index("idx_tasks_week").on(t.weekId),
    statusIdx: index("idx_tasks_status").on(t.status),
  })
);

export const taskClients = pgTable(
  "task_clients",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.clientName] }),
    clientIdx: index("idx_task_clients_client").on(t.clientName),
  })
);

export const scheduledNotifications = pgTable(
  "scheduled_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
    content: jsonb("content").notNull(),
    status: text("status").default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);
