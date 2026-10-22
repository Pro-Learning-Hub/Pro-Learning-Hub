import { Module } from '@nestjs/common';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../gateway/events.module';
import { VotesModule } from '../votes/votes.module';

@Module({
  imports: [CoursesModule, UsersModule, EventsModule, VotesModule],
  controllers: [RepliesController],
  providers: [RepliesService],
  exports: [RepliesService],
})
export class RepliesModule {}
