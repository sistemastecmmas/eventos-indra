
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventosIndraTaskService } from './eventos-indra-task.service';
import { FurIndraModule } from './fur-indra/fur-indra.module';
import { SicovEndpointService } from './sicov-endpoint.service';

@Module({
	imports: [ScheduleModule.forRoot(), FurIndraModule],
	providers: [EventosIndraTaskService, SicovEndpointService],

})
export class AppModule { }
