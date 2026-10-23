import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { RepliesService } from './replies.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { VoteDto } from '../questions/dto/vote.dto';

@Controller()
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Get('questions/:id/replies')
  async getReplies(
    @Param('id') questionId: string,
    @Query('lastFetched') lastFetched: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.repliesService.getReplies(questionId, user.userId, lastFetched));
  }

  @Post('questions/:id/replies')
  @HttpCode(HttpStatus.CREATED)
  async createReply(
    @Param('id') questionId: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.repliesService.createReply(questionId, user.userId, dto));
  }

  @Post('replies/:id/vote')
  async voteReply(
    @Param('id') replyId: string,
    @Body() dto: VoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.repliesService.voteReply(replyId, user.userId, dto.action));
  }

  @Put('replies/:id')
  async updateReply(
    @Param('id') replyId: string,
    @Body() dto: UpdateReplyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.repliesService.updateReply(replyId, user.userId, dto));
  }

  @Delete('replies/:id')
  async deleteReply(@Param('id') replyId: string, @CurrentUser() user: RequestUser) {
    return unwrapResult(await this.repliesService.deleteReply(replyId, user.userId));
  }

  @Post('questions/:questionId/replies/diff')
  async diffSync(
    @Param('questionId') questionId: string,
    @Body() body: { entries?: Array<{ id: string; updatedAt: string }>; lastFetched?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.repliesService.diffSync(questionId, user.userId, body));
  }
}
