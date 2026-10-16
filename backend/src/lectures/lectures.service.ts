import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleService } from '../database/drizzle.service';
import { lectureResources, lectures, sections } from '../database/schema';
import { CoursesService } from '../courses/courses.service';
import { EventsGateway } from '../gateway/events.gateway';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { formatDbTimestamp, getCurrentTimeInDBFormat, parseDbTime } from '../common/time';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { LectureResourceInputDto } from './dto/lecture-resource.dto';

type ResourceRow = { title: string; url: string };

@Injectable()
export class LecturesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly coursesService: CoursesService,
    private readonly events: EventsGateway,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  private normalizeTags(tags?: string[] | string | null): string[] {
    if (!tags) {
      return [];
    }
    if (Array.isArray(tags)) {
      return tags;
    }
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private async getResources(lectureId: string, type: string): Promise<ResourceRow[]> {
    return this.db
      .select({ title: lectureResources.title, url: lectureResources.url })
      .from(lectureResources)
      .where(and(eq(lectureResources.lectureId, lectureId), eq(lectureResources.type, type)))
      .orderBy(lectureResources.createdAt);
  }

  private async insertResources(
    lectureId: string,
    items: LectureResourceInputDto[] | undefined,
    type: string,
    executor: { insert: typeof this.db.insert } = this.db,
  ) {
    if (!items?.length) {
      return;
    }
    await executor.insert(lectureResources).values(
      items.map((item) => ({
        id: uuidv4(),
        title: item.title,
        url: item.url,
        type,
        lectureId,
      })),
    );
  }

  async getLecturesForCourse(
    courseId: string,
    userId: string,
    lastFetched?: string,
  ): Promise<ServiceResult<{ sections: unknown[]; lastFetched: string }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.canAccessCourse(userId, courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }

    const courseSections = await this.db
      .select({
        id: sections.id,
        title: sections.title,
        description: sections.description,
      })
      .from(sections)
      .where(eq(sections.courseId, courseId));

    const result = [];
    for (const section of courseSections) {
      const filters = [eq(lectures.sectionId, section.id)];
      if (lastFetched) {
        filters.push(gt(lectures.createdAt, parseDbTime(lastFetched)));
      }
      const sectionLectures = await this.db
        .select({
          id: lectures.id,
          title: lectures.title,
          description: lectures.description,
          tags: lectures.tags,
          sectionId: lectures.sectionId,
        })
        .from(lectures)
        .where(and(...filters))
        .orderBy(lectures.createdAt);
      if (sectionLectures.length > 0) {
        result.push({
          ...section,
          lectures: sectionLectures.map((lecture) => ({ ...lecture, courseId })),
        });
      }
    }
    return ok({ sections: result, lastFetched: getCurrentTimeInDBFormat() });
  }

  async getLecture(
    courseId: string,
    lectureId: string,
    userId: string,
    updatedAt?: string,
  ): Promise<ServiceResult<{ lectureData: unknown }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.canAccessCourse(userId, courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }

    const [lecture] = await this.db
      .select({
        id: lectures.id,
        updatedAt: lectures.updatedAt,
        title: lectures.title,
        videoLink: lectures.videoLink,
        notes: lectures.notes,
        audioLink: lectures.audioLink,
        slides: lectures.slides,
        subtitles: lectures.subtitles,
        transcript: lectures.transcript,
        description: lectures.description,
        tags: lectures.tags,
      })
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1);
    if (!lecture) {
      return fail('not_found', 'Lecture not found');
    }
    if (updatedAt && formatDbTimestamp(lecture.updatedAt) === updatedAt) {
      return fail('not_modified', 'Lecture not updated');
    }

    return ok({
      lectureData: {
        ...lecture,
        updatedAt: formatDbTimestamp(lecture.updatedAt),
        tags: this.normalizeTags(lecture.tags),
        demos: await this.getResources(lectureId, 'demo'),
        shorts: await this.getResources(lectureId, 'short'),
        quizzez: await this.getResources(lectureId, 'quiz'),
      },
    });
  }

  async getSectionsTitles(courseId: string): Promise<ServiceResult<string[]>> {
    const titles = await this.db
      .select({ title: sections.title })
      .from(sections)
      .where(eq(sections.courseId, courseId));
    return ok(titles.map((row) => row.title));
  }

  async createLecture(
    courseId: string,
    userId: string,
    dto: CreateLectureDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const title = dto.name ?? dto.title;
    const description = dto.description;
    const sectionTitle = dto.section;
    if (!title || !description || !sectionTitle) {
      return fail('validation_error', 'Missing required fields');
    }

    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }

    const tags = this.normalizeTags(dto.tags);
    const youtubeLink = dto.youtubeLink ?? dto.videoLink ?? '';
    const notesLink = dto.notesLink ?? dto.notes ?? '';
    const slidesLink = dto.slidesLink ?? dto.slides ?? '';
    const demos = dto.demos ?? [];
    const shorts = dto.extras ?? [];

    const created = await this.db.transaction(async (tx) => {
      const [existingSection] = await tx
        .select({ id: sections.id })
        .from(sections)
        .where(eq(sections.title, sectionTitle))
        .limit(1);

      let sectionId = existingSection?.id;
      let newSection = false;
      if (!sectionId) {
        newSection = true;
        sectionId = uuidv4();
        await tx.insert(sections).values({
          id: sectionId,
          title: sectionTitle,
          courseId,
        });
      }

      const lectureId = uuidv4();
      await tx.insert(lectures).values({
        id: lectureId,
        title,
        description,
        tags: tags.join(','),
        videoLink: youtubeLink,
        notes: notesLink,
        slides: slidesLink,
        userId,
        courseId,
        sectionId,
      });
      await this.insertResources(lectureId, demos, 'demo', tx);
      await this.insertResources(lectureId, shorts, 'short', tx);

      return { lectureId, sectionId, newSection };
    });

    const newLecture = {
      id: created.lectureId,
      title,
      description,
      section: sectionTitle,
      notes: notesLink,
      slides: slidesLink,
      videoLink: youtubeLink,
      audioLink: '',
      subtitles: '',
      transcript: '',
      tags,
      demos,
      shorts,
      quizzez: [],
    };

    const lastFetched = getCurrentTimeInDBFormat();
    const room = `sections-${courseId}`;
    if (!created.newSection) {
      this.events.emitToRoom(
        room,
        'lectureCreated',
        {
          payload: {
            sectionId: created.sectionId,
            lecture: { id: created.lectureId, title, description, tags },
            lastFetched,
          },
          userId,
        },
        userId,
      );
    } else {
      const [section] = await this.db
        .select({
          id: sections.id,
          title: sections.title,
          description: sections.description,
        })
        .from(sections)
        .where(eq(sections.id, created.sectionId))
        .limit(1);
      this.events.emitToRoom(
        room,
        'sectionCreated',
        {
          payload: {
            newSection: {
              ...section,
              lectures: [{ id: created.lectureId, title, description, tags }],
            },
            lastFetched,
          },
          userId,
        },
        userId,
      );
    }

    return ok(newLecture);
  }

  async updateLecture(
    lectureId: string,
    userId: string,
    dto: UpdateLectureDto,
  ): Promise<ServiceResult<Record<string, unknown>>> {
    const [lecture] = await this.db.select().from(lectures).where(eq(lectures.id, lectureId)).limit(1);
    if (!lecture) {
      return fail('not_found', 'Lecture not found');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, lecture.courseId))) {
      return fail('forbidden', "User don't have previlate to delete this lecture");
    }

    const title = dto.name ?? dto.title ?? lecture.title;
    const description = dto.description ?? lecture.description;
    const youtubeLink = dto.youtubeLink ?? dto.videoLink ?? lecture.videoLink;
    const notesLink = dto.notesLink ?? dto.notes ?? lecture.notes;
    const slidesLink = dto.slidesLink ?? dto.slides ?? lecture.slides ?? '';
    const tags = dto.tags !== undefined ? this.normalizeTags(dto.tags) : this.normalizeTags(lecture.tags);
    const demos = dto.demos ?? [];
    const shorts = dto.extras ?? [];
    const sectionTitle = dto.section;

    const updated = await this.db.transaction(async (tx) => {
      let sectionId = lecture.sectionId;
      if (sectionTitle) {
        const [existingSection] = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(eq(sections.title, sectionTitle))
          .limit(1);
        if (existingSection) {
          sectionId = existingSection.id;
        } else {
          sectionId = uuidv4();
          await tx.insert(sections).values({
            id: sectionId,
            title: sectionTitle,
            courseId: lecture.courseId,
          });
        }
      }

      await tx
        .update(lectures)
        .set({
          title,
          description,
          videoLink: youtubeLink,
          notes: notesLink,
          slides: slidesLink,
          sectionId,
          tags: tags.join(','),
        })
        .where(eq(lectures.id, lectureId));

      await tx.delete(lectureResources).where(eq(lectureResources.lectureId, lectureId));
      await this.insertResources(lectureId, demos, 'demo', tx);
      await this.insertResources(lectureId, shorts, 'short', tx);

      const [row] = await tx
        .select({
          id: lectures.id,
          title: lectures.title,
          description: lectures.description,
          notes: lectures.notes,
          videoLink: lectures.videoLink,
          slides: lectures.slides,
          subtitles: lectures.subtitles,
          transcript: lectures.transcript,
          audioLink: lectures.audioLink,
          sectionId: lectures.sectionId,
        })
        .from(lectures)
        .where(eq(lectures.id, lectureId))
        .limit(1);
      return row;
    });

    const response = {
      ...updated,
      tags,
      demos,
      shorts,
      quizzez: [],
    };
    this.events.emitToRoom(
      [`sections-${lecture.courseId}`, `lecture-${lectureId}`],
      'lectureUpdated',
      { payload: { updatedLecture: response }, userId },
      userId,
    );
    return ok(response);
  }

  async deleteLecture(
    lectureId: string,
    userId: string,
  ): Promise<ServiceResult<{ message: string }>> {
    const [lecture] = await this.db.select().from(lectures).where(eq(lectures.id, lectureId)).limit(1);
    if (!lecture) {
      return fail('not_found', 'Lecture not found');
    }
    if (!(await this.coursesService.isCourseAdmin(userId, lecture.courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }

    const sectionId = await this.db.transaction(async (tx) => {
      const currentSectionId = lecture.sectionId;
      await tx.delete(lectures).where(eq(lectures.id, lectureId));
      const remaining = await tx
        .select({ id: lectures.id })
        .from(lectures)
        .where(eq(lectures.sectionId, currentSectionId));
      if (remaining.length === 0) {
        await tx.delete(sections).where(eq(sections.id, currentSectionId));
      }
      return currentSectionId;
    });

    this.events.emitToRoom(
      [`sections-${lecture.courseId}`, `lecture-${lectureId}`],
      'lectureDeleted',
      { payload: { lectureId, sectionId }, userId },
      userId,
    );
    return ok({ message: 'Lecture deleted successfully' });
  }

  async diffSync(
    courseId: string,
    body: { entries?: Record<string, string[]>; lastSynced?: string },
  ): Promise<ServiceResult<{ entries: unknown; lastSynced: string }>> {
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }
    const { entries, lastSynced } = body;
    if (typeof entries !== 'object' || entries === null || lastSynced == null) {
      return fail('validation_error', 'Missing or invalid entries');
    }

    const parsedLastSynced = parseDbTime(lastSynced);
    const result: {
      updated: Record<string, unknown[]>;
      deleted: { sections: string[]; lectures: Record<string, string[]> };
    } = {
      updated: {},
      deleted: { sections: [], lectures: {} },
    };

    const dbSections = await this.db
      .select({ id: sections.id })
      .from(sections)
      .where(and(eq(sections.courseId, courseId), lte(sections.createdAt, parsedLastSynced)));
    const dbSectionIds = dbSections.map((row) => row.id);

    for (const section of dbSectionIds) {
      const sectionLectures = await this.db
        .select({
          id: lectures.id,
          title: lectures.title,
          description: lectures.description,
          tags: lectures.tags,
          sectionId: lectures.sectionId,
          updatedAt: lectures.updatedAt,
        })
        .from(lectures)
        .where(and(eq(lectures.sectionId, section), lte(lectures.createdAt, parsedLastSynced)));

      for (const lecture of sectionLectures) {
        if (lecture.updatedAt >= parsedLastSynced) {
          if (!result.updated[section]) {
            result.updated[section] = [];
          }
          result.updated[section].push({
            id: lecture.id,
            title: lecture.title,
            description: lecture.description,
            tags: lecture.tags,
            sectionId: lecture.sectionId,
            courseId,
          });
        }
      }

      const existingIds = sectionLectures.map((lecture) => lecture.id);
      result.deleted.lectures[section] = (entries[section] ?? []).filter(
        (lectureId) => !existingIds.includes(lectureId),
      );
    }

    result.deleted.sections = Object.keys(entries).filter((sectionId) => !dbSectionIds.includes(sectionId));
    return ok({ entries: result, lastSynced: getCurrentTimeInDBFormat() });
  }

  async searchLectures(
    courseId: string,
    query: string,
  ): Promise<ServiceResult<{ results: unknown[]; total: number; query: string; context: { courseId: string } }>> {
    if (!courseId || !query) {
      return fail('validation_error', 'Invalid search parameters. Expecting (courseId & query)');
    }
    const decodedQuery = decodeURIComponent(query);
    const course = await this.coursesService.findById(courseId);
    if (!course) {
      return fail('not_found', 'Course not found');
    }

    const tsQuery = sql`plainto_tsquery('simple', ${decodedQuery})`;
    const rows = await this.db
      .select({
        id: lectures.id,
        title: lectures.title,
        description: lectures.description,
        tags: lectures.tags,
        createdAt: lectures.createdAt,
        sectionId: lectures.sectionId,
        courseId: lectures.courseId,
        relevance: sql<number>`ts_rank(${lectures.searchVector}, ${tsQuery})`,
      })
      .from(lectures)
      .where(
        and(
          eq(lectures.courseId, courseId),
          sql`${lectures.searchVector} @@ ${tsQuery}`,
          sql`ts_rank(${lectures.searchVector}, ${tsQuery}) > 0.25`,
        ),
      )
      .orderBy(desc(sql`ts_rank(${lectures.searchVector}, ${tsQuery})`));

    const results = rows.map((lecture) => ({
      ...lecture,
      createdAt: formatDbTimestamp(lecture.createdAt),
      tags: this.normalizeTags(lecture.tags),
    }));
    return ok({
      results,
      total: results.length,
      query: decodedQuery,
      context: { courseId },
    });
  }
}
