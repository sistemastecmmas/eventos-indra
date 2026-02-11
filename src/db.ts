import mysql from 'mysql2/promise';
import { envs } from './config/envs';

export const pool = mysql.createPool({
  host: envs.HOST_DB,
  user: envs.USER_DB,
  password: envs.USER_DB_PASSWORD,
  database: envs.NAME_DB,
  port: envs.PORT_DB, // Cambia si tu MariaDB usa otro puerto
});