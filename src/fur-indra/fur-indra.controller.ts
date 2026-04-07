




import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FurIndraService } from './fur-indra.service';
@Controller('fur-indra')
export class FurIndraController {

    constructor(private readonly furIndraService: FurIndraService) { }

    @Post()
    sendFur(@Body() body: { fur: string }) {
        //    console.log('Body recibido:', body);
        // console.log('Fur recibido:', body?.fur);

        return this.furIndraService.enviarFur(body.fur);
    }

    @Get()
    data() {
        return 'Ingrese';
    }
}