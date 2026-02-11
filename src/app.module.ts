
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventosIndraTaskService } from './eventos-indra-task.service';

@Module({
	imports: [ScheduleModule.forRoot()],
	providers: [EventosIndraTaskService],
})
export class AppModule {}
