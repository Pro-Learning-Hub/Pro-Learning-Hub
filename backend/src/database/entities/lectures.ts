import { sql } from 'drizzle-orm';
import { customType, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { sections } from './sections';
import { users } from './users';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const lectures = pgTable('lectures', {
  id: varchar('id', { length: 36 }).primaryKey(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 512 }).notNull(),
  tags: varchar('tags', { length: 255 }),
  videoLink: varchar('videoLink', { length: 255 }).notNull(),
  notes: varchar('notes', { length: 255 }).notNull(),
  audioLink: varchar('audioLink', { length: 255 }),
  slides: varchar('slides', { length: 255 }),
  subtitles: varchar('subtitles', { length: 255 }),
  transcript: varchar('transcript', { length: 255 }),
  userId: varchar('userId', { length: 36 })
    .notNull()
    .references(() => users.id),
  courseId: varchar('courseId', { length: 36 })
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  sectionId: varchar('sectionId', { length: 36 })
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  searchVector: tsvector('searchVector').generatedAlwaysAs(
    sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(tags, ''))`,
  ),
});
