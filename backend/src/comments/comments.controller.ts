import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('announcements/:id/comments')
  async getComments(@Param('id') announcementId: string) {
    return unwrapResult(await this.commentsService.getComments(announcementId));
  }

  @Post('announcements/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('id') announcementId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.commentsService.createComment(announcementId, user.userId, dto));
  }

  @Put('comments/:id')
  async updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.commentsService.updateComment(id, user.userId, dto));
  }

  @Delete('comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: RequestUser) {
    return unwrapResult(await this.commentsService.deleteComment(commentId, user.userId));
  }
}
