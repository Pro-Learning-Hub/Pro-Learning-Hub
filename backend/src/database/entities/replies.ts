import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { questions } from './questions';
import { users } from './users';

export const replies = pgTable('replies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  upvotes: integer('upvotes').default(0).notNull(),
  body: varchar('body', { length: 1024 }).notNull(),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  questionId: varchar('questionId', { length: 36 })
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
});
