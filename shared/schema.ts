import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - required for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),

  // 👇 use snake_case here
  first_name: varchar("first_name").default(""),
  profile_image_url: varchar("profile_image_url").default(""),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});


// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

// Task shares table for collaboration
export const taskShares = pgTable("task_shares", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission", { length: 10 }).notNull().default("view"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task activities for real-time updates
export const taskActivities = pgTable("task_activities", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  taskShares: many(taskShares),
  activities: many(taskActivities),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  owner: one(users, {
    fields: [tasks.ownerId],
    references: [users.id],
  }),
  shares: many(taskShares),
  activities: many(taskActivities),
}));

export const taskSharesRelations = relations(taskShares, ({ one }) => ({
  task: one(tasks, {
    fields: [taskShares.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskShares.userId],
    references: [users.id],
  }),
}));

export const taskActivitiesRelations = relations(taskActivities, ({ one }) => ({
  task: one(tasks, {
    fields: [taskActivities.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskActivities.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
export const insertTaskSchema = createInsertSchema(tasks, {
  // --- ADD THIS OVERRIDE FOR dueDate ---
  dueDate: z.coerce.date().nullable().optional(),
  // --- END OF ADDITION ---
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertTaskShareSchema = createInsertSchema(taskShares).omit({
  id: true,
  createdAt: true,
});

export const insertTaskActivitySchema = createInsertSchema(taskActivities).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskShare = typeof taskShares.$inferSelect;
export type InsertTaskShare = z.infer<typeof insertTaskShareSchema>;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type InsertTaskActivity = z.infer<typeof insertTaskActivitySchema>;

// Extended types with relations
export type TaskWithDetails = Task & {
  owner: User;
  shares: (TaskShare & { user: User })[];
};

export type TaskStats = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  dueToday: number; // Added this new stat
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
};