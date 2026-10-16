import { Injectable } from '@nestjs/common';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleService } from '../database/drizzle.service';
import { announcements } from '../database/schema';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import { EventsGateway } from '../gateway/events.gateway';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { formatDbTimestamp, getCurrentTimeInDBFormat, parseDbTime, withFormattedTimestamps } from '../common/time';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
    private readonly events: EventsGateway,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  private bodyFromDto(dto: { details?: string; body?: string }) {
    return dto.details ?? dto.body;
  }

  async getAnnouncements(
    courseId: string,
    userId: string,
    lastFetched?: string,
  ): Promise<ServiceResult<{ announcements: unknown[]; lastFetched: string }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.canAccessCourse(userId, courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }
    const filters = [eq(announcements.courseId, courseId)];
    if (lastFetched) {
      filters.push(gt(announcements.createdAt, parseDbTime(lastFetched)));
    }
    const rows = await this.db
      .select()
      .from(announcements)
      .where(and(...filters))
      .orderBy(announcements.createdAt);
    const results = [];
    for (const announcement of rows.reverse()) {
      const user = await this.usersService.getUserPublicData(announcement.userId);
      const { userId: _userId, ...rest } = withFormattedTimestamps(announcement);
      results.push({ ...rest, user });
    }
    return ok({ announcements: results, lastFetched: getCurrentTimeInDBFormat() });
  }

  async createAnnouncement(
    courseId: string,
    userId: string,
    dto: CreateAnnouncementDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const body = this.bodyFromDto(dto);
    if (!dto.title || !body) {
      return fail('validation_error', 'Missing required fields');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }
    const id = uuidv4();
    await this.db.insert(announcements).values({
      id,
      courseId,
      userId,
      title: dto.title,
      body,
    });
    const [created] = await this.db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    const user = await this.usersService.getUserPublicData(userId);
    const { userId: _userId, ...rest } = withFormattedTimestamps(created);
    const lastFetched = getCurrentTimeInDBFormat();
    this.events.emitToRoom(
      `announcements-${courseId}`,
      'announcementCreated',
      { payload: rest, userId, lastFetched },
      userId,
    );
    return ok({ ...rest, lastFetched, user });
  }

  async updateAnnouncement(
    id: string,
    userId: string,
    dto: UpdateAnnouncementDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const [announcement] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    if (!announcement) {
      return fail('not_found', 'Announcement not found');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, announcement.courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }
    const body = this.bodyFromDto(dto);
    await this.db
      .update(announcements)
      .set({
        title: dto.title ?? announcement.title,
        body: body ?? announcement.body,
      })
      .where(eq(announcements.id, id));
    const [updated] = await this.db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    const user = await this.usersService.getUserPublicData(updated.userId);
    const { userId: _userId, ...rest } = withFormattedTimestamps(updated);
    const updatedAnnouncement = { ...rest, user };
    this.events.emitToRoom(
      `announcements-${announcement.courseId}`,
      'announcementUpdated',
      { payload: { updatedAnnouncement } },
      userId,
    );
    return ok(updatedAnnouncement);
  }

  async deleteAnnouncement(id: string, userId: string): Promise<ServiceResult<{ success: true; message: string }>> {
    const [announcement] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    if (!announcement) {
      return fail('not_found', 'Announcement not found');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, announcement.courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }
    await this.db.delete(announcements).where(eq(announcements.id, id));
    this.events.emitToRoom(
      `announcements-${announcement.courseId}`,
      'announcementDeleted',
      { payload: { announcementId: id }, userId },
      userId,
    );
    return ok({ success: true, message: 'Announcement deleted successfully' });
  }

  async diffSync(
    courseId: string,
    userId: string,
    entries: Array<{ id: string; updatedAt: string }>,
  ): Promise<ServiceResult<{ updated: unknown[]; deleted: string[] }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.canAccessCourse(userId, courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }
    const map = new Map(entries.map((entry) => [entry.id, entry.updatedAt]));
    const ids = Array.from(map.keys());
    const dbRows = ids.length
      ? await this.db.select().from(announcements).where(inArray(announcements.id, ids))
      : [];
    const updated = [];
    for (const entry of dbRows) {
      if (map.get(entry.id) !== formatDbTimestamp(entry.updatedAt)) {
        updated.push(withFormattedTimestamps(entry));
      }
      map.delete(entry.id);
    }
    return ok({ updated, deleted: Array.from(map.keys()) });
  }
}
