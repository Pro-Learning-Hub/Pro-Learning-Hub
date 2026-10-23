import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('passwordHash', { length: 512 }),
    googleId: varchar('googleId', { length: 255 }),
    firstName: varchar('firstName', { length: 255 }).notNull(),
    lastName: varchar('lastName', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }),
    pictureId: varchar('pictureId', { length: 255 }),
    pictureUrl: varchar('pictureUrl', { length: 255 }),
    pictureThumbnail: varchar('pictureThumbnail', { length: 255 }),
    role: varchar('role', { length: 255 }).default('student').notNull(),
  },
  (table) => ({
    emailUnique: unique('users_email_unique').on(table.email),
    googleIdUnique: unique('users_googleId_unique').on(table.googleId),
    roleCheck: check('users_role_check', sql`${table.role} IN ('student', 'admin', 'tutor')`),
    identityCheck: check(
      'users_identity_check',
      sql`${table.googleId} IS NOT NULL OR ${table.passwordHash} IS NOT NULL`,
    ),
  }),
);
