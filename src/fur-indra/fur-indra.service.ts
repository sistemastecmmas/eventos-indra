import { Injectable, Logger } from "@nestjs/common";
import { envs } from '../config/envs';
import { encryptRijndael128CBC } from '../rijndael';
import net from 'net';
import { enviarFurSicov } from "src/sicov-soap";
import { pool } from "src/db";



@Injectable()
export class FurIndraService {
    private readonly logger = new Logger(FurIndraService.name);


    async enviarFur(fur: string): Promise<string> {
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
                return 'No se pudo conectar al servidor';
            }
            const furDesestructurado = fur.split(';');
            const placa = furDesestructurado[9];

            let eve = encryptRijndael128CBC(key, iv, fur);
            // console.log(`Encrypted FUR: ${eve}`);
            const respuesta = await enviarFurSicov(url, eve);
            // console.log(`Respuesta de SICOV: ${JSON.stringify(respuesta)}`);
            let estado = 'error';
            let enviado = '2';
            if (respuesta.codRespuesta === 1) {
                estado = 'exito';
                enviado = '1';
            }
            let msg = respuesta.msjRespuesta || 'Sin mensaje de respuesta';
            const data = {
                idelemento: placa,
                cadena: fur,
                tipo: 'f',
                enviado,
                respuesta: msg
            };
            await pool.query('INSERT INTO eventosindra (idelemento, cadena, tipo, enviado, respuesta) VALUES (?, ?, ?, ?, ?)', [data.idelemento, data.cadena, data.tipo , data.enviado, data.respuesta]);
        } catch (error) {
            this.logger.error('Error al enviar el FUR', error);
        }
        return 'FUR recebido: ' + fur;
    }



}