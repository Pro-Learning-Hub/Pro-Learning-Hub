import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const courses = pgTable('courses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 512 }),
});

export const courseAdmins = pgTable('courseAdmins', {
  courseId: varchar('courseId', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const courseEnrollments = pgTable('courseEnrollments', {
  courseId: varchar('courseId', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
