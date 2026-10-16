import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { announcements } from './announcements';
import { users } from './users';

export const comments = pgTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  body: varchar('body', { length: 512 }).notNull(),
  announcementId: varchar('announcementId', { length: 36 })
    .notNull()
    .references(() => announcements.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
