import { sql } from 'drizzle-orm';
import { customType, integer, pgTable, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { lectures } from './lectures';
import { users } from './users';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const questions = pgTable(
  'questions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: varchar('body', { length: 1024 }).notNull(),
    upvotes: integer('upvotes').default(0).notNull(),
    repliesCount: integer('repliesCount').default(0).notNull(),
    userId: varchar('userId', { length: 36 })
      .notNull()
      .references(() => users.id),
    lectureId: varchar('lectureId', { length: 36 }).references(() => lectures.id, {
      onDelete: 'cascade',
    }),
    courseId: varchar('courseId', { length: 36 }).references(() => courses.id, {
      onDelete: 'cascade',
    }),
    searchVector: tsvector('searchVector').generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))`,
    ),
  },
  (table) => ({
    uniqueTriple: unique('questions_course_lecture_id').on(table.courseId, table.lectureId, table.id),
  }),
);
