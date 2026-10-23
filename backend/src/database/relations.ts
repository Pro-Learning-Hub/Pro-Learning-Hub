import { relations } from 'drizzle-orm';
import { announcements } from './entities/announcements';
import { comments } from './entities/comments';
import { courseAdmins, courseEnrollments, courses } from './entities/courses';
import { lectureResources } from './entities/lecture-resources';
import { lectures } from './entities/lectures';
import { questions } from './entities/questions';
import { replies } from './entities/replies';
import { sections } from './entities/sections';
import { users } from './entities/users';
import { votes } from './entities/votes';

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(courseEnrollments),
  adminCourses: many(courseAdmins),
  lectures: many(lectures),
  questions: many(questions),
  replies: many(replies),
  announcements: many(announcements),
  comments: many(comments),
  votes: many(votes),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(courseEnrollments),
  admins: many(courseAdmins),
  sections: many(sections),
  lectures: many(lectures),
  announcements: many(announcements),
  questions: many(questions),
}));

export const courseAdminsRelations = relations(courseAdmins, ({ one }) => ({
  course: one(courses, { fields: [courseAdmins.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseAdmins.userId], references: [users.id] }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseEnrollments.userId], references: [users.id] }),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, { fields: [sections.courseId], references: [courses.id] }),
  lectures: many(lectures),
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  course: one(courses, { fields: [lectures.courseId], references: [courses.id] }),
  section: one(sections, { fields: [lectures.sectionId], references: [sections.id] }),
  author: one(users, { fields: [lectures.userId], references: [users.id] }),
  resources: many(lectureResources),
  questions: many(questions),
}));

export const lectureResourcesRelations = relations(lectureResources, ({ one }) => ({
  lecture: one(lectures, { fields: [lectureResources.lectureId], references: [lectures.id] }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, { fields: [questions.userId], references: [users.id] }),
  course: one(courses, { fields: [questions.courseId], references: [courses.id] }),
  lecture: one(lectures, { fields: [questions.lectureId], references: [lectures.id] }),
  replies: many(replies),
  votes: many(votes),
}));

export const repliesRelations = relations(replies, ({ one, many }) => ({
  author: one(users, { fields: [replies.userId], references: [users.id] }),
  question: one(questions, { fields: [replies.questionId], references: [questions.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, { fields: [votes.userId], references: [users.id] }),
  question: one(questions, { fields: [votes.questionId], references: [questions.id] }),
  reply: one(replies, { fields: [votes.replyId], references: [replies.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  author: one(users, { fields: [announcements.userId], references: [users.id] }),
  course: one(courses, { fields: [announcements.courseId], references: [courses.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, { fields: [comments.userId], references: [users.id] }),
  announcement: one(announcements, {
    fields: [comments.announcementId],
    references: [announcements.id],
  }),
}));
