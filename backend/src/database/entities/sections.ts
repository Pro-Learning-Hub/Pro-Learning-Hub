import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';

export const sections = pgTable('sections', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  title: text('title').notNull(),
  description: varchar('description', { length: 512 }),
  courseId: varchar('courseId', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
});
