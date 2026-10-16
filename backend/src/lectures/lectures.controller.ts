import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { LecturesService } from './lectures.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';

@Controller()
export class LecturesController {
  constructor(private readonly lecturesService: LecturesService) {}

  @Public()
  @Get('lectures/media')
  async proxyMedia(
    @Query('url') url: string,
    @Query('type') type: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(400).send('Missing ?url=');
    }
    if (!type) {
      return res.status(400).send('Missing ?type=');
    }
    const isAudioOnly = type === 'audio';
    const controller = new AbortController();
    const timeout = 1000 * 60 * 10;
    req.on('aborted', () => controller.abort());
    try {
      const downloadResponse = await fetch(
        `${process.env.YT_DOWNLOAD_SERVICE_URL}/download?url=${encodeURIComponent(url)}&isAudioOnly=${isAudioOnly}`,
        { signal: controller.signal },
      );
      const contentType = downloadResponse.headers.get('Content-Type');
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
      }
      if (!downloadResponse.body) {
        return res.status(500).send('Something went wrong');
      }
      Readable.fromWeb(downloadResponse.body as never).pipe(res);
    } catch {
      res.status(500).send('Something went wrong');
    }
  }

  @Public()
  @Get('lectures/transcript')
  async proxyTranscript(
    @Query('url') url: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(400).send('Missing ?url=');
    }
    try {
      const transcriptResponse = await fetch(
        `${process.env.YT_DOWNLOAD_SERVICE_URL}/transcript?url=${encodeURIComponent(url)}&format=${encodeURIComponent(format ?? '')}`,
      );
      if (!transcriptResponse.ok) {
        throw new Error('Failed to fetch transcript');
      }
      const contentType = transcriptResponse.headers.get('Content-Type');
      const contentDisposition = transcriptResponse.headers.get('Content-Disposition');
      const fileName = transcriptResponse.headers.get('X-File-Name');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
      }
      if (fileName) {
        res.setHeader('X-File-Name', fileName);
      }
      res.setHeader('Access-Control-Expose-Headers', 'X-File-Name');
      if (!transcriptResponse.body) {
        return res.status(500).send('Something went wrong');
      }
      Readable.fromWeb(transcriptResponse.body as never).pipe(res);
    } catch {
      res.status(500).send('Something went wrong');
    }
  }

  @Get('lectures/search')
  async searchLectures(@Query('courseId') courseId: string, @Query('query') query: string) {
    return unwrapResult(await this.lecturesService.searchLectures(courseId, query));
  }

  @Get('courses/:id/lectures')
  async getLectures(
    @Param('id') courseId: string,
    @Query('lastFetched') lastFetched: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.lecturesService.getLecturesForCourse(courseId, user.userId, lastFetched),
    );
  }

  @Get('courses/:courseId/lectures/:lectureId')
  async getLecture(
    @Param('courseId') courseId: string,
    @Param('lectureId') lectureId: string,
    @Query('updatedAt') updatedAt: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.lecturesService.getLecture(courseId, lectureId, user.userId, updatedAt),
    );
  }

  @Get('courses/:id/sections_titles')
  async getSectionsTitles(@Param('id') courseId: string) {
    return unwrapResult(await this.lecturesService.getSectionsTitles(courseId));
  }

  @Post('courses/:id/lectures')
  @HttpCode(HttpStatus.CREATED)
  async createLecture(
    @Param('id') courseId: string,
    @Body() dto: CreateLectureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.lecturesService.createLecture(courseId, user.userId, dto));
  }

  @Put('lectures/:id')
  async updateLecture(
    @Param('id') lectureId: string,
    @Body() dto: UpdateLectureDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.lecturesService.updateLecture(lectureId, user.userId, dto));
  }

  @Delete('lectures/:id')
  async deleteLecture(@Param('id') lectureId: string, @CurrentUser() user: RequestUser) {
    return unwrapResult(await this.lecturesService.deleteLecture(lectureId, user.userId));
  }

  @Public()
  @Post('courses/:id/lectures/diff')
  async diffSync(
    @Param('id') courseId: string,
    @Body() body: { entries?: Record<string, string[]>; lastSynced?: string },
  ) {
    return unwrapResult(await this.lecturesService.diffSync(courseId, body));
  }
}
