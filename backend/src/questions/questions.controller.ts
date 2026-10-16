import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { VoteDto } from './dto/vote.dto';

@Controller()
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('questions/search')
  async searchQuestions(
    @Query('courseId') courseId: string,
    @Query('lectureId') lectureId: string,
    @Query('query') query: string,
  ) {
    return unwrapResult(await this.questionsService.searchQuestions(query, courseId, lectureId));
  }

  @Post('questions/diff')
  @HttpCode(HttpStatus.CREATED)
  async diffSync(
    @Body()
    body: {
      entries?: Array<{ id: string; updatedAt: string }>;
      lastFetched?: string;
      courseId?: string;
      lectureId?: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.questionsService.diffSync(user.userId, body));
  }

  @Get('courses/:id/general_discussion')
  async getGeneralDiscussion(
    @Param('id') courseId: string,
    @Query('lastFetched') lastFetched: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.questionsService.getGeneralDiscussion(courseId, user.userId, lastFetched),
    );
  }

  @Get('lectures/:id/discussion')
  async getLectureDiscussion(
    @Param('id') lectureId: string,
    @Query('lastFetched') lastFetched: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.questionsService.getLectureDiscussion(lectureId, user.userId, lastFetched),
    );
  }

  @Post('courses/:id/general_discussion')
  @HttpCode(HttpStatus.CREATED)
  async createGeneralQuestion(
    @Param('id') courseId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.questionsService.createGeneralDiscussionQuestion(courseId, user.userId, dto),
    );
  }

  @Post('lectures/:id/discussion')
  @HttpCode(HttpStatus.CREATED)
  async createLectureQuestion(
    @Param('id') lectureId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.questionsService.createLectureDiscussionQuestion(lectureId, user.userId, dto),
    );
  }

  @Post('questions/:id/vote')
  @HttpCode(HttpStatus.CREATED)
  async voteQuestion(
    @Param('id') questionId: string,
    @Body() dto: VoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.questionsService.voteQuestion(questionId, user.userId, dto));
  }

  @Put('questions/:id')
  async updateQuestion(
    @Param('id') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.questionsService.updateQuestion(questionId, user.userId, dto));
  }

  @Delete('questions/:id')
  async deleteQuestion(@Param('id') questionId: string, @CurrentUser() user: RequestUser) {
    return unwrapResult(await this.questionsService.deleteQuestion(questionId, user.userId));
  }
}
