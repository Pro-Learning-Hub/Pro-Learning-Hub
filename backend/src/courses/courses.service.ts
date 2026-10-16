import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { courseAdmins, courseEnrollments, courses } from '../database/schema';

@Injectable()
export class CoursesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async findById(id: string) {
    const [course] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return course ?? null;
  }

  async isCourseAdmin(userId: string, courseId: string): Promise<boolean> {
    const rows = await this.db
      .select({ courseId: courseAdmins.courseId })
      .from(courseAdmins)
      .where(and(eq(courseAdmins.courseId, courseId), eq(courseAdmins.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }

  async isUserEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
    const rows = await this.db
      .select({ courseId: courseEnrollments.courseId })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }

  async canAccessCourse(userId: string, courseId: string): Promise<boolean> {
    const [enrolled, admin] = await Promise.all([
      this.isUserEnrolledInCourse(userId, courseId),
      this.isCourseAdmin(userId, courseId),
    ]);
    return enrolled || admin;
  }
}
