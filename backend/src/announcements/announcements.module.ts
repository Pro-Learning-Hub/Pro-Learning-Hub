import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [CoursesModule, UsersModule, EventsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
