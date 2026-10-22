import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleService } from '../database/drizzle.service';
import { announcements, comments } from '../database/schema';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { EventsGateway } from '../gateway/events.gateway';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { withFormattedTimestamps } from '../common/time';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
    private readonly events: EventsGateway,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async getComments(announcementId: string): Promise<ServiceResult<unknown[]>> {
    const [announcement] = await this.db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    if (!announcement) {
      return fail('not_found', 'Announcement not found');
    }
    const rows = await this.db
      .select()
      .from(comments)
      .where(eq(comments.announcementId, announcementId))
      .orderBy(comments.createdAt);
    const ordered = rows.reverse();
    const usersById = await this.usersService.getPublicUsersByIds(
      ordered.map((comment) => comment.userId),
    );
    const results = ordered.map((comment) => {
      const { userId: _userId, ...rest } = withFormattedTimestamps(comment);
      return { ...rest, user: usersById.get(comment.userId) ?? null };
    });
    return ok(results);
  }

  async createComment(
    announcementId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const body = dto.comment ?? dto.body;
    if (!body) {
      return fail('validation_error', 'Missing required fields');
    }
    const [announcement] = await this.db
      .select({ courseId: announcements.courseId })
      .from(announcements)
      .where(eq(announcements.id, announcementId))
      .limit(1);
    if (!announcement) {
      return fail('not_found', 'Announcement not found');
    }
    const id = uuidv4();
    await this.db.insert(comments).values({
      id,
      announcementId,
      userId,
      body,
    });
    const [created] = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    const user = await this.usersService.getUserPublicData(userId);
    const { userId: _userId, ...rest } = withFormattedTimestamps(created);
    const newComment = { ...rest, user };
    this.events.emitToRoom(
      [`announcements-${announcement.courseId}`, `comments-${announcementId}`],
      'commentCreated',
      { payload: { announcementId, newComment }, userId },
      userId,
    );
    return ok(newComment);
  }

  async updateComment(
    id: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const [comment] = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!comment) {
      return fail('not_found', 'Comment not found');
    }
    if (comment.userId !== userId) {
      return fail('forbidden', 'User is not authorized to edit this comment');
    }
    await this.db.update(comments).set({ body: dto.body }).where(eq(comments.id, id));
    const [updated] = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    const user = await this.usersService.getUserPublicData(updated.userId);
    const { userId: _userId, ...rest } = withFormattedTimestamps(updated);
    const editedComment = { ...rest, user };
    this.events.emitToRoom(
      `comments-${updated.announcementId}`,
      'commentEdited',
      { payload: { editedComment }, userId },
      userId,
    );
    return ok(editedComment);
  }

  async deleteComment(
    commentId: string,
    userId: string,
  ): Promise<ServiceResult<{ success: true; message: string }>> {
    const [comment] = await this.db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    if (!comment) {
      return fail('not_found', 'Comment not found');
    }
    const [announcement] = await this.db
      .select({ courseId: announcements.courseId })
      .from(announcements)
      .where(eq(announcements.id, comment.announcementId))
      .limit(1);
    const isAdmin = announcement
      ? await this.coursesService.isCourseAdmin(userId, announcement.courseId)
      : false;
    if (comment.userId !== userId && !isAdmin) {
      return fail('forbidden', 'User is not a course admin');
    }
    await this.db.delete(comments).where(eq(comments.id, commentId));
    this.events.emitToRoom(
      `comments-${comment.announcementId}`,
      'commentDeleted',
      {
        payload: { announcementId: comment.announcementId, commentId },
        userId,
        courseId: announcement?.courseId,
      },
      userId,
    );
    return ok({ success: true, message: 'Comment deleted successfully' });
  }
}
