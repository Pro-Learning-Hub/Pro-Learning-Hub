import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [UsersModule, CoursesModule, EventsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
