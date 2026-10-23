import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

export const announcements = pgTable('announcements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: varchar('body', { length: 1024 }).notNull(),
  commentsCount: integer('commentsCount').default(0).notNull(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id),
  courseId: varchar('courseId', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
});
