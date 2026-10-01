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
    /** Destino de la llamada SOAP (sin ?WSDL). Solo cuando se configuró una URL completa. */
    location?: string;
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

    /**
     * Acepta "host", "host:puerto" o URL completa (con o sin puerto).
     * Sin puerto: 80 para http y 443 para https.
     */
    parseHostPort(value?: string): { host: string; port: number; isUrl: boolean; url?: URL } {
        const raw = String(value ?? '').trim();

        if (!raw) {
            return { host: '', port: 80, isUrl: false };
        }

        if (/^https?:\/\//i.test(raw)) {
            try {
                const url = new URL(raw);
                const defaultPort = url.protocol === 'https:' ? 443 : 80;
                const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;
                return { host: url.hostname, port, isUrl: true, url };
            } catch {
                return { host: '', port: 80, isUrl: false };
            }
        }

        const hasPort = raw.includes(':');
        if (!hasPort) {
            return { host: raw, port: 80, isUrl: false };
        }

        const [hostRaw, portRaw] = raw.split(':');
        const host = String(hostRaw ?? '').trim();
        const parsed = Number.parseInt(String(portRaw ?? '').trim(), 10);
        const port = Number.isInteger(parsed) && parsed > 0 ? parsed : 80;

        return {
            host,
            port,
            isUrl: false,
        };
    }

    async resolveSicovEndpointForIndra(): Promise<ResolvedSicovEndpoint> {
        // Este paquete es exclusivo para INDRA; no se evalua logica de otros proveedores aqui.
        const baseUrl = String(envs.IP_SICOV ?? '').trim();
        const alternativoState = await this.getSicovAlternativoState();

        const useAlternativo = alternativoState.activo === '1' && alternativoState.url.length > 0;
        const configuredUrl = useAlternativo ? alternativoState.url : baseUrl;
        const { host, port, isUrl, url } = this.parseHostPort(configuredUrl);

        // URL completa: se usa tal cual (con ?WSDL si no trae query) y la llamada SOAP se fuerza a esa misma URL.
        // host o host:puerto: se arma http://host:puerto/sicov.asmx?WSDL como siempre.
        let wsdlUrl = host ? `http://${host}:${port}/sicov.asmx?WSDL` : '';
        let location: string | undefined;
        if (isUrl && url && host) {
            location = `${url.origin}${url.pathname}`;
            wsdlUrl = url.search ? `${location}${url.search}` : `${location}?WSDL`;
        }

        return {
            host,
            port,
            wsdlUrl,
            location,
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