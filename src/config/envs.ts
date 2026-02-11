import 'dotenv/config';
import * as joi from 'joi';

interface EnvConfig {
    USER_DB: string;
    USER_DB_PASSWORD: string;
    NAME_DB: string;
    PORT_DB: number;
    HOST_DB: string;
    PORT: number;
    IP_SICOV?: string;
}

const envSchema = joi.object({
    USER_DB: joi.string().required(),
    USER_DB_PASSWORD: joi.string().required(),
    NAME_DB: joi.string().required(),
    PORT_DB: joi.number().required(),
    HOST_DB: joi.string().required(),
    PORT: joi.number().required(),
    IP_SICOV: joi.string().optional(),
}).unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envConf: EnvConfig = value;

export const envs = {
    USER_DB: envConf.USER_DB,
    USER_DB_PASSWORD: envConf.USER_DB_PASSWORD,
    NAME_DB: envConf.NAME_DB,
    PORT_DB: envConf.PORT_DB,
    HOST_DB: envConf.HOST_DB,
    PORT: envConf.PORT,
    IP_SICOV: envConf.IP_SICOV,
};