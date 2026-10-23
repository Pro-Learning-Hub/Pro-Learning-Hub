import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { lectures } from './lectures';

export const lectureResources = pgTable(
  'lectureResources',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    url: varchar('url', { length: 255 }).notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    lectureId: varchar('lectureId', { length: 36 })
      .notNull()
      .references(() => lectures.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    typeCheck: check('lectureResources_type_check', sql`${table.type} IN ('short', 'demo', 'quiz')`),
  }),
);
