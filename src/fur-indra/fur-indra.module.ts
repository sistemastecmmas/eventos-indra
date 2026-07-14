
import { Module } from '@nestjs/common';
import { FurIndraController } from './fur-indra.controller';
import { FurIndraService } from './fur-indra.service';
import { SicovEndpointService } from 'src/sicov-endpoint.service';

@Module({
    controllers: [FurIndraController],
    providers: [FurIndraService, SicovEndpointService],
})
export class FurIndraModule { }
