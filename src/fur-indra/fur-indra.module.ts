
import { Module } from '@nestjs/common';
import { FurIndraController } from './fur-indra.controller';
import { FurIndraService } from './fur-indra.service';

@Module({
    controllers: [FurIndraController],
    providers: [FurIndraService],
})
export class FurIndraModule { }
