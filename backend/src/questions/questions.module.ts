import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../gateway/events.module';
import { VotesModule } from '../votes/votes.module';

@Module({
  imports: [CoursesModule, UsersModule, EventsModule, VotesModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
