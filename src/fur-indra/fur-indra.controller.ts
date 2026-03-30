




import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FurIndraService } from './fur-indra.service';
@Controller('fur-indra')
export class FurIndraController {

    constructor(private readonly furIndraService: FurIndraService) { }

    @Post()
    sendFur(@Query('fur') fur: string) {
        return this.furIndraService.enviarFur(fur);
    }
}