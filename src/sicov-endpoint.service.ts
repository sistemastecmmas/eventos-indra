import { Injectable, Logger } from '@nestjs/common';
import net from 'net';
import { pool } from './db';
import { envs } from './config/envs';

type SicovAlternativoState = {
    activo: string;
    url: string;
};

export type ResolvedSicovEndpoint = {
    host: string;
    port: number;
    wsdlUrl: string;
    isIndra: boolean;
    activo: string;
    configuredUrl: string;
};

@Injectable()
export class SicovEndpointService {
    private readonly logger = new Logger(SicovEndpointService.name);

    async getSicovAlternativoState(): Promise<SicovAlternativoState> {
        const defaults: SicovAlternativoState = { activo: '0', url: '' };

        try {
            const [rows]: any[] = await pool.query(
                'SELECT idconfiguracion, valor FROM config_prueba WHERE idconfiguracion IN (40000, 40001)',
            );

            let activo = defaults.activo;
            let url = defaults.url;

            for (const row of rows ?? []) {
                const idConfiguracion = Number(row?.idconfiguracion);
                const valor = String(row?.valor ?? '').trim();

                if (idConfiguracion === 40000) {
                    activo = valor === '1' ? '1' : '0';
                }

                if (idConfiguracion === 40001) {
                    url = valor;
                }
            }

            return {
                activo,
                url,
            };
        } catch (error) {
            this.logger.warn('No fue posible leer config_prueba para SICOV alternativo. Se usan defaults seguros.');
            return defaults;
        }
    }

    parseHostPort(value?: string): { host: string; port: number } {
        const raw = String(value ?? '').trim();

        if (!raw) {
            return { host: '', port: 80 };
        }

        const hasPort = raw.includes(':');
        if (!hasPort) {
            return { host: raw, port: 80 };
        }

        const [hostRaw, portRaw] = raw.split(':');
        const host = String(hostRaw ?? '').trim();
        const parsed = Number.parseInt(String(portRaw ?? '').trim(), 10);
        const port = Number.isInteger(parsed) && parsed > 0 ? parsed : 80;

        return {
            host,
            port,
        };
    }

    async resolveSicovEndpointForIndra(): Promise<ResolvedSicovEndpoint> {
        // Este paquete es exclusivo para INDRA; no se evalua logica de otros proveedores aqui.
        const baseUrl = String(envs.IP_SICOV ?? '').trim();
        const alternativoState = await this.getSicovAlternativoState();

        const useAlternativo = alternativoState.activo === '1' && alternativoState.url.length > 0;
        const configuredUrl = useAlternativo ? alternativoState.url : baseUrl;
        const { host, port } = this.parseHostPort(configuredUrl);

        return {
            host,
            port,
            wsdlUrl: host ? `http://${host}:${port}/sicov.asmx?WSDL` : '',
            isIndra: true,
            activo: alternativoState.activo,
            configuredUrl,
        };
    }

    async checkSocketConnectivity(host: string, port: number): Promise<boolean> {
        if (!host) {
            return false;
        }

        return new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(2000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect({ port, host });
        });
    }
}