import { Injectable } from '@nestjs/common';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleService } from '../database/drizzle.service';
import { lectures, questions, replies, votes } from '../database/schema';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { VotesService } from '../votes/votes.service';
import { EventsGateway } from '../gateway/events.gateway';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { formatDbTimestamp, getCurrentTimeInDBFormat, parseDbTime, withFormattedTimestamps } from '../common/time';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';

@Injectable()
export class RepliesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly usersService: UsersService,
    private readonly coursesService: CoursesService,
    private readonly votesService: VotesService,
    private readonly events: EventsGateway,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async getUpvoteStatus(userId: string, replyId: string): Promise<boolean> {
    return this.votesService.hasVoted(userId, { replyId });
  }

  private async getReplyCourseId(replyId: string): Promise<string | null> {
    const [row] = await this.db
      .select({
        courseIdFromQuestion: questions.courseId,
        lectureId: questions.lectureId,
      })
      .from(replies)
      .innerJoin(questions, eq(replies.questionId, questions.id))
      .where(eq(replies.id, replyId))
      .limit(1);
    if (!row) {
      return null;
    }
    if (row.courseIdFromQuestion) {
      return row.courseIdFromQuestion;
    }
    if (!row.lectureId) {
      return null;
    }
    const [lecture] = await this.db
      .select({ courseId: lectures.courseId })
      .from(lectures)
      .where(eq(lectures.id, row.lectureId))
      .limit(1);
    return lecture?.courseId ?? null;
  }

  private async getQuestionParentId(questionId: string) {
    const [result] = await this.db
      .select({
        courseId: questions.courseId,
        lectureId: questions.lectureId,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    return result ?? null;
  }

  async getReplies(
    questionId: string,
    userId: string,
    lastFetched?: string,
  ): Promise<ServiceResult<{ question: unknown; repliesList: unknown[]; lastFetched: string }>> {
    const [question] = await this.db
      .select({
        id: questions.id,
        title: questions.title,
        body: questions.body,
        updatedAt: questions.updatedAt,
        upvotes: questions.upvotes,
        repliesCount: questions.repliesCount,
        userId: questions.userId,
        lectureId: questions.lectureId,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!question) {
      return fail('not_found', 'Question not found');
    }

    const isNew = lastFetched
      ? question.updatedAt >= parseDbTime(lastFetched)
      : true;
    const questionUpvoted = await this.votesService.hasVoted(userId, { questionId });

    let questionResponse: Record<string, unknown>;
    if (!isNew) {
      questionResponse = {
        id: question.id,
        repliesCount: question.repliesCount,
        upvoted: questionUpvoted,
        upvotes: question.upvotes,
        updatedAt: formatDbTimestamp(question.updatedAt),
      };
    } else {
      const { userId: _userId, ...rest } = question;
      questionResponse = {
        ...rest,
        updatedAt: formatDbTimestamp(question.updatedAt),
        upvoted: questionUpvoted,
        user: await this.usersService.getUserPublicData(question.userId),
      };
    }

    const filters = [eq(replies.questionId, questionId)];
    if (lastFetched) {
      filters.push(sql`${replies.createdAt} > ${parseDbTime(lastFetched)}`);
    }
    const replyRows = await this.db
      .select({
        id: replies.id,
        body: replies.body,
        userId: replies.userId,
        updatedAt: replies.updatedAt,
        upvotes: replies.upvotes,
      })
      .from(replies)
      .where(and(...filters))
      .orderBy(desc(replies.upvotes));

    const [usersById, voted] = await Promise.all([
      this.usersService.getPublicUsersByIds(replyRows.map((reply) => reply.userId)),
      this.votesService.votedIds(
        userId,
        'reply',
        replyRows.map((reply) => reply.id),
      ),
    ]);
    const repliesList = replyRows.map((reply) => ({
      ...reply,
      updatedAt: formatDbTimestamp(reply.updatedAt),
      user: usersById.get(reply.userId) ?? null,
      upvoted: voted.has(reply.id),
    }));

    return ok({
      question: questionResponse,
      repliesList,
      lastFetched: getCurrentTimeInDBFormat(),
    });
  }

  async voteReply(
    replyId: string,
    userId: string,
    action: 'upvote' | 'downvote',
  ): Promise<ServiceResult<{ message: string }>> {
    if (!action) {
      return fail('validation_error', 'Missing required fields');
    }
    const [reply] = await this.db
      .select({ id: replies.id, questionId: replies.questionId })
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    if (!reply) {
      return fail('not_found', 'Reply not found');
    }

    const applied = await this.db.transaction(async (tx) => {
      const changed = await this.votesService.apply(tx, userId, action, { replyId });
      if (!changed) {
        return false;
      }
      await tx
        .update(replies)
        .set({
          upvotes: sql`${replies.upvotes} + ${action === 'upvote' ? 1 : -1}`,
        })
        .where(eq(replies.id, replyId));
      return true;
    });
    if (!applied) {
      return fail('conflict', action === 'upvote' ? 'Already upvoted' : 'Vote not found');
    }

    this.events.emitToRoom(
      `question-${reply.questionId}`,
      'replyUpvoteToggled',
      {
        payload: {
          replyId,
          questionId: reply.questionId,
          isUpvoted: action === 'upvote',
        },
        userId,
      },
      userId,
    );
    return ok({
      message: action === 'upvote' ? 'Upvoted successfully' : 'Vote deleted successfully',
    });
  }

  async createReply(
    questionId: string,
    userId: string,
    dto: CreateReplyDto,
  ): Promise<ServiceResult<{ newReply: unknown; lastFetched: string }>> {
    if (!userId || !dto.body) {
      return fail('validation_error', 'Missing required fields');
    }
    const [question] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!question) {
      return fail('not_found', 'Question not found');
    }

    const id = uuidv4();
    await this.db.insert(replies).values({
      id,
      questionId,
      userId,
      body: dto.body,
    });
    const [newReply] = await this.db.select().from(replies).where(eq(replies.id, id)).limit(1);
    const user = await this.usersService.getUserPublicData(newReply.userId);
    const { userId: _userId, ...rest } = withFormattedTimestamps(newReply);
    const response = { ...rest, user, upvoted: false };
    const lastFetched = getCurrentTimeInDBFormat();

    this.events.emitToRoom(
      `question-${questionId}`,
      'replyCreated',
      { payload: { newReply: response, lastFetched }, userId },
      userId,
    );
    const parent = await this.getQuestionParentId(questionId);
    if (parent) {
      const room = parent.lectureId
        ? `lectureDiscussion-${parent.lectureId}`
        : `generalDiscussion-${parent.courseId}`;
      this.events.emitToRoom(room, 'replyCreated', {
        payload: { questionId, lectureId: parent.lectureId, courseId: parent.courseId },
        userId,
      });
    }
    return ok({ newReply: response, lastFetched });
  }

  async updateReply(
    replyId: string,
    userId: string,
    dto: UpdateReplyDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    if (!dto.body) {
      return fail('validation_error', 'Missing required fields');
    }
    const [reply] = await this.db
      .select({ id: replies.id, userId: replies.userId })
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    if (!reply) {
      return fail('not_found', 'Reply not found');
    }
    if (reply.userId !== userId) {
      return fail('forbidden', 'User is not authorized to edit this reply');
    }

    await this.db.update(replies).set({ body: dto.body }).where(eq(replies.id, replyId));
    const [updatedReply] = await this.db
      .select({
        id: replies.id,
        questionId: replies.questionId,
        body: replies.body,
        updatedAt: replies.updatedAt,
      })
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    const payload = {
      ...updatedReply,
      updatedAt: formatDbTimestamp(updatedReply.updatedAt),
    };
    this.events.emitToRoom(
      `question-${updatedReply.questionId}`,
      'replyUpdated',
      { payload: { updatedReply: payload }, userId },
      userId,
    );
    return ok(payload);
  }

  async deleteReply(
    replyId: string,
    userId: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const [reply] = await this.db
      .select({
        id: replies.id,
        userId: replies.userId,
        questionId: replies.questionId,
      })
      .from(replies)
      .where(eq(replies.id, replyId))
      .limit(1);
    if (!reply) {
      return fail('not_found', 'Reply not found');
    }
    const replyCourseId = await this.getReplyCourseId(replyId);
    const isAdmin = replyCourseId ? await this.coursesService.isCourseAdmin(userId, replyCourseId) : false;
    if (reply.userId !== userId && !isAdmin) {
      return fail('forbidden', 'User is not authorized to delete this reply');
    }

    await this.db.delete(replies).where(eq(replies.id, replyId));
    this.events.emitToRoom(
      `question-${reply.questionId}`,
      'replyDeleted',
      { payload: { replyId, questionId: reply.questionId }, userId },
      userId,
    );
    const parent = await this.getQuestionParentId(reply.questionId);
    if (parent) {
      const room = parent.lectureId
        ? `lectureDiscussion-${parent.lectureId}`
        : `generalDiscussion-${parent.courseId}`;
      this.events.emitToRoom(room, 'replyDeleted', {
        payload: { questionId: reply.questionId, lectureId: parent.lectureId, courseId: parent.courseId },
        userId,
      });
    }
    return ok({ message: 'Reply deleted successfully' });
  }

  async diffSync(
    questionId: string,
    userId: string,
    body: { entries?: Array<{ id: string; updatedAt: string }>; lastFetched?: string },
  ): Promise<ServiceResult<{ results: unknown; lastSynced: string; questionId: string }>> {
    const { entries = [], lastFetched } = body;
    const entriesMap = new Map(entries.map((reply) => [reply.id, reply.updatedAt]));
    const dbEntries = await this.db
      .select({
        id: replies.id,
        updatedAt: replies.updatedAt,
        body: replies.body,
        upvotes: replies.upvotes,
      })
      .from(replies)
      .where(
        and(
          eq(replies.questionId, questionId),
          lastFetched ? lte(replies.createdAt, parseDbTime(lastFetched)) : sql`true`,
        ),
      );

    const userVoteRows = await this.db
      .select({ replyId: votes.replyId })
      .from(votes)
      .where(and(eq(votes.userId, userId), sql`${votes.replyId} IS NOT NULL`));
    const userVotes = new Set(userVoteRows.map((row) => row.replyId));

    const results: { existing: Record<string, unknown>; deleted: string[] } = {
      existing: {},
      deleted: [],
    };
    for (const entry of dbEntries) {
      const updatedAt = formatDbTimestamp(entry.updatedAt);
      const replyEntry: Record<string, unknown> = {
        id: entry.id,
        upvotes: entry.upvotes,
      };
      if (updatedAt !== entriesMap.get(entry.id)) {
        replyEntry.body = entry.body;
        replyEntry.updatedAt = updatedAt;
      }
      if (userVotes.has(entry.id)) {
        replyEntry.upvoted = true;
      }
      results.existing[entry.id] = replyEntry;
      entriesMap.delete(entry.id);
    }
    results.deleted = Array.from(entriesMap.keys());
    return ok({
      results,
      lastSynced: getCurrentTimeInDBFormat(),
      questionId,
    });
  }
}
