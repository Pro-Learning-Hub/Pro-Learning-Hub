import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, unique, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { questions } from './questions';
import { replies } from './replies';
import { users } from './users';

export const votes = pgTable(
  'votes',
  {
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    userId: varchar('userId', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: varchar('questionId', { length: 36 }).references(() => questions.id, {
      onDelete: 'cascade',
    }),
    replyId: varchar('replyId', { length: 36 }).references(() => replies.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => ({
    uniqueVote: unique('votes_user_resource').on(table.userId, table.questionId, table.replyId),
    uniqueQuestionVote: uniqueIndex('votes_user_question_unique')
      .on(table.userId, table.questionId)
      .where(sql`${table.questionId} IS NOT NULL`),
    uniqueReplyVote: uniqueIndex('votes_user_reply_unique')
      .on(table.userId, table.replyId)
      .where(sql`${table.replyId} IS NOT NULL`),
    xorCheck: check(
      'votes_xor_check',
      sql`(${table.questionId} IS NOT NULL AND ${table.replyId} IS NULL) OR (${table.questionId} IS NULL AND ${table.replyId} IS NOT NULL)`,
    ),
  }),
);
