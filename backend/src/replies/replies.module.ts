import { Module } from '@nestjs/common';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [CoursesModule, UsersModule, EventsModule],
  controllers: [RepliesController],
  providers: [RepliesService],
  exports: [RepliesService],
})
export class RepliesModule {}
