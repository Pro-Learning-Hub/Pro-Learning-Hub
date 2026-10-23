import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('courses/:id/announcements')
  async getAnnouncements(
    @Param('id') courseId: string,
    @Query('lastFetched') lastFetched: string,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.announcementsService.getAnnouncements(courseId, user.userId, lastFetched),
    );
  }

  @Post('courses/:id/announcements')
  @HttpCode(HttpStatus.CREATED)
  async createAnnouncement(
    @Param('id') courseId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(
      await this.announcementsService.createAnnouncement(courseId, user.userId, dto),
    );
  }

  @Put('announcements/:id')
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return unwrapResult(await this.announcementsService.updateAnnouncement(id, user.userId, dto));
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return unwrapResult(await this.announcementsService.deleteAnnouncement(id, user.userId));
  }

  @Post('courses/:id/announcements/diff')
  async diffSync(
    @Param('id') courseId: string,
    @Body() body: Array<{ id: string; updatedAt: string }>,
    @CurrentUser() user: RequestUser,
  ) {
    const entries = Array.isArray(body) ? body : [];
    return unwrapResult(await this.announcementsService.diffSync(courseId, user.userId, entries));
  }
}
