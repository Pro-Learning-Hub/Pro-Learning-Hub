import { Injectable } from '@nestjs/common';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleService } from '../database/drizzle.service';
import { lectures, questions, votes } from '../database/schema';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import { VotesService } from '../votes/votes.service';
import { EventsGateway } from '../gateway/events.gateway';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { formatDbTimestamp, getCurrentTimeInDBFormat, parseDbTime } from '../common/time';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { VoteDto } from './dto/vote.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
    private readonly votesService: VotesService,
    private readonly events: EventsGateway,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async getUpvoteStatus(userId: string, resourceId: string, resourceType: 'question' | 'reply') {
    return resourceType === 'question'
      ? this.votesService.hasVoted(userId, { questionId: resourceId })
      : this.votesService.hasVoted(userId, { replyId: resourceId });
  }

  private async getQuestionCourseId(questionId: string): Promise<string | null> {
    const [row] = await this.db
      .select({
        courseIdFromQuestion: questions.courseId,
        lectureId: questions.lectureId,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
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

  async getGeneralDiscussion(
    courseId: string,
    userId: string,
    lastFetched?: string,
  ): Promise<ServiceResult<{ questions: unknown[]; lastFetched: string }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.canAccessCourse(userId, courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }

    const filters = [eq(questions.courseId, courseId)];
    if (lastFetched) {
      filters.push(sql`${questions.createdAt} > ${parseDbTime(lastFetched)}`);
    }
    const entries = await this.db
      .select({
        id: questions.id,
        title: questions.title,
        body: questions.body,
        updatedAt: questions.updatedAt,
        upvotes: questions.upvotes,
        repliesCount: questions.repliesCount,
        userId: questions.userId,
      })
      .from(questions)
      .where(and(...filters))
      .orderBy(desc(questions.upvotes));

    const results = [];
    for (const entry of entries) {
      const user = await this.usersService.getUserPublicData(entry.userId);
      const upvoted = await this.getUpvoteStatus(userId, entry.id, 'question');
      results.push({
        ...entry,
        updatedAt: formatDbTimestamp(entry.updatedAt),
        user,
        upvoted,
      });
    }
    return ok({ questions: results, lastFetched: getCurrentTimeInDBFormat() });
  }

  async getLectureDiscussion(
    lectureId: string,
    userId: string,
    lastFetched?: string,
  ): Promise<ServiceResult<{ results: unknown[]; lastFetched: string }>> {
    const [lecture] = await this.db
      .select({ id: lectures.id })
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1);
    if (!lecture) {
      return fail('not_found', 'Lecture not found');
    }

    const filters = [eq(questions.lectureId, lectureId)];
    if (lastFetched) {
      filters.push(sql`${questions.createdAt} > ${parseDbTime(lastFetched)}`);
    }
    const entries = await this.db
      .select({
        id: questions.id,
        title: questions.title,
        body: questions.body,
        userId: questions.userId,
        upvotes: questions.upvotes,
        repliesCount: questions.repliesCount,
        lectureId: questions.lectureId,
        updatedAt: questions.updatedAt,
      })
      .from(questions)
      .where(and(...filters))
      .orderBy(desc(questions.upvotes));

    const results = [];
    for (const entry of entries) {
      const user = await this.usersService.getUserPublicData(entry.userId);
      const upvoted = await this.getUpvoteStatus(userId, entry.id, 'question');
      results.push({
        ...entry,
        updatedAt: formatDbTimestamp(entry.updatedAt),
        user,
        upvoted,
      });
    }
    return ok({ results, lastFetched: getCurrentTimeInDBFormat() });
  }

  async createGeneralDiscussionQuestion(
    courseId: string,
    userId: string,
    dto: CreateQuestionDto,
  ): Promise<ServiceResult<{ newEntry: unknown; lastFetched: string }>> {
    if (!dto.title || !dto.body) {
      return fail('validation_error', 'Missing required fields');
    }
    const user = await this.usersService.getUserPublicData(userId);
    const newEntryId = uuidv4();
    const createTime = getCurrentTimeInDBFormat();
    await this.db.insert(questions).values({
      id: newEntryId,
      title: dto.title,
      body: dto.body,
      userId,
      courseId,
    });
    const lastFetched = getCurrentTimeInDBFormat();
    const newEntry = {
      id: newEntryId,
      title: dto.title,
      body: dto.body,
      user,
      updatedAt: createTime,
      upvotes: 0,
      upvoted: false,
      repliesCount: 0,
    };
    this.events.emitToRoom(
      `generalDiscussion-${courseId}`,
      'generalDiscussionQuestionCreated',
      { payload: { newEntry, lastFetched }, userId, courseId },
      userId,
    );
    return ok({ newEntry, lastFetched });
  }

  async createLectureDiscussionQuestion(
    lectureId: string,
    userId: string,
    dto: CreateQuestionDto,
  ): Promise<ServiceResult<{ newEntry: unknown; lastFetched: string }>> {
    if (!userId || !dto.title || !dto.body) {
      return fail('validation_error', 'Missing required fields');
    }
    const newEntryId = uuidv4();
    const createTime = getCurrentTimeInDBFormat();
    await this.db.insert(questions).values({
      id: newEntryId,
      title: dto.title,
      body: dto.body,
      userId,
      lectureId,
    });
    const lastFetched = getCurrentTimeInDBFormat();
    const newEntry = {
      id: newEntryId,
      title: dto.title,
      body: dto.body,
      user: await this.usersService.getUserPublicData(userId),
      updatedAt: createTime,
      upvotes: 0,
      upvoted: false,
      repliesCount: 0,
      lectureId,
    };
    this.events.emitToRoom(
      `lectureDiscussion-${lectureId}`,
      'lectureQuestionCreated',
      { payload: { question: newEntry, lectureId, lastFetched }, userId },
      userId,
    );
    return ok({ newEntry, lastFetched });
  }

  async voteQuestion(
    questionId: string,
    userId: string,
    dto: VoteDto,
  ): Promise<ServiceResult<{ message: string }>> {
    if (!dto.action || !['upvote', 'downvote'].includes(dto.action)) {
      return fail('validation_error', 'Missing or invalid action field');
    }
    const [question] = await this.db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!question) {
      return fail('not_found', 'Question not found');
    }

    const applied = await this.db.transaction(async (tx) => {
      const changed = await this.votesService.apply(tx, userId, dto.action, { questionId });
      if (!changed) {
        return false;
      }
      await tx
        .update(questions)
        .set({
          upvotes: sql`${questions.upvotes} + ${dto.action === 'upvote' ? 1 : -1}`,
        })
        .where(eq(questions.id, questionId));
      return true;
    });
    if (!applied) {
      return fail(
        'conflict',
        dto.action === 'upvote' ? 'Already upvoted' : 'Vote not found',
      );
    }

    const socketRoom = question.courseId
      ? `generalDiscussion-${question.courseId}`
      : `lectureDiscussion-${question.lectureId}`;
    this.events.emitToRoom(
      [socketRoom, `question-${questionId}`],
      'questionUpvoteToggled',
      {
        payload: {
          questionId,
          isUpvoted: dto.action === 'upvote',
          lectureId: question.lectureId,
        },
        userId,
      },
      userId,
    );
    return ok({
      message: dto.action === 'upvote' ? 'Upvoted successfully' : 'Vote deleted successfully',
    });
  }

  async updateQuestion(
    questionId: string,
    userId: string,
    dto: UpdateQuestionDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const [question] = await this.db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!question) {
      return fail('not_found', 'Question not found');
    }
    if (question.userId !== userId) {
      return fail('forbidden', 'User is not authorized to edit this question');
    }

    await this.db
      .update(questions)
      .set({
        title: dto.title ?? question.title,
        body: dto.body ?? question.body,
      })
      .where(eq(questions.id, questionId));

    const [updatedQuestion] = await this.db
      .select({
        id: questions.id,
        title: questions.title,
        body: questions.body,
        updatedAt: questions.updatedAt,
        lectureId: questions.lectureId,
        repliesCount: questions.repliesCount,
        upvotes: questions.upvotes,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    const editedQuestion = {
      ...updatedQuestion,
      updatedAt: formatDbTimestamp(updatedQuestion.updatedAt),
      user: await this.usersService.getUserPublicData(userId),
      upvoted: await this.getUpvoteStatus(userId, questionId, 'question'),
    };

    const room = question.lectureId
      ? `lectureDiscussion-${question.lectureId}`
      : `generalDiscussion-${question.courseId}`;
    const event = question.lectureId ? 'lectureQuestionEdited' : 'generalDiscussionQuestionEdited';
    this.events.emitToRoom(room, event, { payload: { editedQuestion } }, userId);
    this.events.emitToRoom(
      `question-${questionId}`,
      'questionEdited',
      { payload: { editedQuestion }, userId },
      userId,
    );
    return ok(editedQuestion);
  }

  async deleteQuestion(
    questionId: string,
    userId: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const [question] = await this.db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!question) {
      return fail('not_found', 'Question not found');
    }
    const courseId = await this.getQuestionCourseId(question.id);
    const isAdmin = courseId ? await this.coursesService.isCourseAdmin(userId, courseId) : false;
    if (question.userId !== userId && !isAdmin) {
      return fail('forbidden', 'User is not authorized');
    }

    await this.db.delete(questions).where(eq(questions.id, questionId));
    const lectureId = question.lectureId;
    const room = lectureId ? `lectureDiscussion-${lectureId}` : `generalDiscussion-${courseId}`;
    const event = lectureId ? 'lectureQuestionDeleted' : 'generalDiscussionQuestionDeleted';
    this.events.emitToRoom(room, event, { payload: { questionId, lectureId }, userId }, userId);
    this.events.emitToRoom(
      `question-${questionId}`,
      'questionDeleted',
      { payload: { questionId, lectureId }, userId },
      userId,
    );
    return ok({ message: 'Question deleted successfully' });
  }

  async diffSync(
    userId: string,
    body: {
      entries?: Array<{ id: string; updatedAt: string }>;
      lastFetched?: string;
      courseId?: string;
      lectureId?: string;
    },
  ): Promise<ServiceResult<{ results: unknown; lastSynced: string }>> {
    const { entries = [], lastFetched, courseId, lectureId } = body;
    if (courseId && lectureId) {
      return fail(
        'unauthorized',
        'courseId and lectureId are both defined?!.. which category are the questions?',
      );
    }
    if (courseId) {
      const course = await this.coursesService.findById(courseId);
      if (!course) {
        return fail('not_found', 'Course not found');
      }
    } else if (lectureId) {
      const [lecture] = await this.db.select({ id: lectures.id }).from(lectures).where(eq(lectures.id, lectureId)).limit(1);
      if (!lecture) {
        return fail('not_found', 'Lecture not found');
      }
    } else {
      return fail('unauthorized', 'Missing course or lecture id');
    }

    const entriesUpdatedAt = new Map(entries.map((entry) => [entry.id, entry.updatedAt]));
    const parentFilter = courseId
      ? eq(questions.courseId, courseId)
      : eq(questions.lectureId, lectureId as string);
    const existingQuestions = await this.db
      .select({
        id: questions.id,
        updatedAt: questions.updatedAt,
        title: questions.title,
        body: questions.body,
        repliesCount: questions.repliesCount,
        upvotes: questions.upvotes,
      })
      .from(questions)
      .where(and(parentFilter, lastFetched ? lte(questions.createdAt, parseDbTime(lastFetched)) : sql`true`))
      .orderBy(desc(questions.updatedAt));

    const userVoteRows = await this.db
      .select({ questionId: votes.questionId })
      .from(votes)
      .where(and(eq(votes.userId, userId), sql`${votes.questionId} IS NOT NULL`));
    const userVotes = new Set(userVoteRows.map((row) => row.questionId));

    const results: { existing: Record<string, unknown>; deleted: string[] } = {
      existing: {},
      deleted: [],
    };
    for (const entry of existingQuestions) {
      const updatedAt = formatDbTimestamp(entry.updatedAt);
      const questionEntry: Record<string, unknown> = {
        id: entry.id,
        updatedAt,
        repliesCount: entry.repliesCount,
        upvotes: entry.upvotes,
        upvoted: userVotes.has(entry.id),
      };
      if (updatedAt !== entriesUpdatedAt.get(entry.id)) {
        questionEntry.title = entry.title;
        questionEntry.body = entry.body;
      }
      entriesUpdatedAt.delete(entry.id);
      results.existing[entry.id] = questionEntry;
    }
    results.deleted = Array.from(entriesUpdatedAt.keys());
    return ok({ results, lastSynced: getCurrentTimeInDBFormat() });
  }

  async searchQuestions(
    query: string,
    courseId?: string,
    lectureId?: string,
  ): Promise<
    ServiceResult<{
      results: string[];
      total: number;
      query: string;
      context: { courseId?: string; lectureId?: string };
    }>
  > {
    if ((courseId && lectureId) || (!courseId && !lectureId) || !query) {
      return fail('validation_error', 'Invalid search parameters. Expecting (courseId | lectureId, query)');
    }
    const decodedQuery = decodeURIComponent(query);
    if (courseId) {
      const course = await this.coursesService.findById(courseId);
      if (!course) {
        return fail('not_found', 'Course not found');
      }
    } else if (lectureId) {
      const [lecture] = await this.db.select({ id: lectures.id }).from(lectures).where(eq(lectures.id, lectureId)).limit(1);
      if (!lecture) {
        return fail('not_found', 'Lecture not found');
      }
    }

    const tsQuery = sql`plainto_tsquery('simple', ${decodedQuery})`;
    const parentFilter = courseId
      ? eq(questions.courseId, courseId)
      : eq(questions.lectureId, lectureId as string);
    const rows = await this.db
      .select({
        id: questions.id,
        relevance: sql<number>`ts_rank(${questions.searchVector}, ${tsQuery})`,
      })
      .from(questions)
      .where(
        and(
          parentFilter,
          sql`${questions.searchVector} @@ ${tsQuery}`,
          sql`ts_rank(${questions.searchVector}, ${tsQuery}) > 0.25`,
        ),
      )
      .orderBy(desc(sql`ts_rank(${questions.searchVector}, ${tsQuery})`));

    const questionIds = rows.map((row) => row.id);
    return ok({
      results: questionIds,
      total: questionIds.length,
      query: decodedQuery,
      context: courseId ? { courseId } : { lectureId },
    });
  }
}
