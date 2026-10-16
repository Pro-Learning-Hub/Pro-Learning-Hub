import { Module } from '@nestjs/common';
import { LecturesController } from './lectures.controller';
import { LecturesService } from './lectures.service';
import { CoursesModule } from '../courses/courses.module';
import { EventsModule } from '../gateway/events.module';

@Module({
  imports: [CoursesModule, EventsModule],
  controllers: [LecturesController],
  providers: [LecturesService],
  exports: [LecturesService],
})
export class LecturesModule {}
