
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { pool } from './db';
import { envs } from './config/envs';
import { decryptRijndael128CBC, encryptRijndael128CBC } from './rijndael';
import { enviarEventosSicov } from './sicov-soap';
import net from 'net';

@Injectable()
export class EventosIndraTaskService {
    private readonly logger = new Logger(EventosIndraTaskService.name);

    @Cron(CronExpression.EVERY_SECOND)
    async handleCron() {
        try {
            const [rows]: any[] = await pool.query('SELECT * FROM eventosindra e WHERE e.enviado=0 AND e.tipo="e"');
            for (const ev of rows) {
                try {
                    let ipSicov = envs.IP_SICOV;
                    let port = 80;
                    let url = `http://${ipSicov}/sicov.asmx?WSDL`;
                    const key = 'v239pShjXXXXXXXXXXXXXXXXXXXXXXXX';
                    const iv = 'sicovcontacindra';
                    if (ipSicov && ipSicov.includes(':')) {
                        const partes = ipSicov.split(':');
                        ipSicov = partes[0];
                        port = parseInt(partes[1], 10);
                    }
                    const isAlive = await new Promise<boolean>(resolve => {
                        const socket = new net.Socket();
                        socket.setTimeout(2000);
                        socket.on('connect', () => { socket.destroy(); resolve(true); });
                        socket.on('timeout', () => { socket.destroy(); resolve(false); });
                        socket.on('error', () => { resolve(false); });
                        socket.connect({ port, host: ipSicov });
                    });
                    if (!isAlive) {
                        this.logger.warn(`No se pudo conectar a ${ipSicov}:${port}`);
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
                        const respuesta = await enviarEventosSicov(url, eve);
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
                    this.logger.error('Error procesando evento', err);
                }
            }
        } catch (error) {
            this.logger.error('Error consultando eventos_indra', error);
        }
    }
}
