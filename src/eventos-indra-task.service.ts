
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { pool } from './db';
import { decryptRijndael128CBC, encryptRijndael128CBC } from './rijndael';
import { enviarEventosSicov } from './sicov-soap';
import { SicovEndpointService } from './sicov-endpoint.service';

@Injectable()
export class EventosIndraTaskService {
    private readonly logger = new Logger(EventosIndraTaskService.name);

    constructor(private readonly sicovEndpointService: SicovEndpointService) { }

    @Cron(CronExpression.EVERY_SECOND)
    async handleCron() {
        try {
            const [rows]: any[] = await pool.query('SELECT * FROM eventosindra e WHERE e.enviado=0 AND e.tipo="e"');
            for (const ev of rows) {
                try {
                    const endpoint = await this.sicovEndpointService.resolveSicovEndpointForIndra();
                    const eventId = ev?.ideventosindra;

                    if (!endpoint.host || !endpoint.wsdlUrl) {
                        this.logger.warn(
                            `No se pudo resolver endpoint SICOV en cron para evento id=${eventId}`,
                        );
                        continue;
                    }

                    const key = 'v239pShjXXXXXXXXXXXXXXXXXXXXXXXX';
                    const iv = 'sicovcontacindra';

                    this.logger.log(
                        `Cron evento id=${eventId} usando SICOV host=${endpoint.host} port=${endpoint.port} wsdl=${endpoint.wsdlUrl} activoAlternativo=${endpoint.activo}`,
                    );

                    const isAlive = await this.sicovEndpointService.checkSocketConnectivity(endpoint.host, endpoint.port);
                    if (!isAlive) {
                        this.logger.warn(
                            `No se pudo conectar a SICOV para evento id=${eventId} host=${endpoint.host} port=${endpoint.port} wsdl=${endpoint.wsdlUrl}`,
                        );
                        continue;
                    }
                    let datos_ = (ev.cadena as string).split('|');
                    if (datos_.length === 1) {
                        let eve = decryptRijndael128CBC(key, iv, ev.cadena);
                        datos_ = eve.split('|');
                    }
                    const idRunt = process.env.ID_RUNT || '1234567890';
                    let cad = `${datos_[0]}|${datos_[1]}|${datos_[2]}|${datos_[3]}|${datos_[4]}|${datos_[5]}||${idRunt}`;
                    if (datos_[2] !== 'Ruidos') {
                        let eve = encryptRijndael128CBC(key, iv, cad);
                        const respuesta = await enviarEventosSicov(endpoint.wsdlUrl, eve);
                        let estado = 'error';
                        let msg = 'Operación Fallida';
                        let enviado = '2';
                        if (respuesta.codRespuesta === 1) {
                            estado = 'exito';
                            msg = 'Operación Exitosa';
                            enviado = '1';
                        }
                        const data = {
                            enviado,
                            ideventosindra: ev.ideventosindra,
                            respuesta: `${msg}|${respuesta.codRespuesta}|evento|${estado}|${respuesta.msjRespuesta}`,
                        };
                        await pool.query('UPDATE eventosindra SET enviado=?, respuesta=? WHERE ideventosindra=?', [data.enviado, data.respuesta, data.ideventosindra]);
                    }
                } catch (err) {
                    this.logger.error(`Error procesando evento id=${ev?.ideventosindra}`, err);
                }
            }
        } catch (error) {
            this.logger.error('Error consultando eventos_indra', error);
        }
    }
}
