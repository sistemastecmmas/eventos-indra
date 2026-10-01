# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A NestJS service that bridges TECMMAS's `tecmmas_bd` MariaDB database with INDRA's SICOV SOAP web service. It runs two flows:

- **Events (cron)**: `EventosIndraTaskService` polls the `eventosindra` table every second for unsent "event" rows (`tipo='e'`, `enviado=0`), encrypts and forwards them to SICOV's `EnviarEventosSicov` SOAP operation, then writes the result back.
- **FUR (HTTP)**: `POST /fur-indra` (`FurIndraController` → `FurIndraService`) accepts a raw FUR string, encrypts it, forwards it to SICOV's `EnviarFurSicov` SOAP operation, and inserts a new row into `eventosindra` (`tipo='f'`) recording the outcome.

## Commands

```bash
yarn start          # run (no watch)
yarn start:dev       # run with watch mode — normal dev loop
yarn start:debug      # watch mode with --inspect-brk debugger
yarn build           # nest build -> dist/
yarn start:prod       # node dist/main (run the built output)

yarn lint            # eslint --fix over src/apps/libs/test
yarn format           # prettier --write over src/ and test/

yarn test             # jest unit tests (*.spec.ts under src/)
yarn test:watch        # jest --watch
yarn test:cov          # jest --coverage
yarn test:debug        # jest --runInBand under node --inspect-brk
yarn test:e2e          # jest -c test/jest-e2e.json (test/app.e2e-spec.ts)

# run a single unit test file
yarn test src/path/to/file.spec.ts
# run a single e2e test file
yarn test:e2e -- test/app.e2e-spec.ts
```

Docker: `dockerfile` is a plain dev image (`npm install`, no build step, used by `docker-compose.yml` which bind-mounts `./src` and runs `yarn start`). `dockerfile.prod` is a multi-stage build that compiles with `nest build` and ships `dist/` renamed to `dist-obfuscated/` (despite the name, there is no actual obfuscation step currently in the Dockerfile) run via `node dist-obfuscated/main.js`.

## Configuration

Environment variables are validated at import time via Joi in `src/config/envs.ts` (`import 'dotenv/config'` triggers `.env` loading). Required: `USER_DB`, `USER_DB_PASSWORD`, `NAME_DB`, `PORT_DB`, `HOST_DB`, `PORT`. Optional: `IP_SICOV` (default SICOV host, e.g. `172.26.124.36:8056`). `ID_RUNT` is read directly off `process.env` in `eventos-indra-task.service.ts` (not part of the Joi schema) and defaults to `'1234567890'` if unset. See `.env.template` for example values. A missing/invalid required var throws at process startup (`Config validation error: ...`).

## Architecture notes

- **No ORM.** `src/db.ts` exports a single shared `mysql2/promise` pool (`pool`), imported directly wherever DB access is needed (`EventosIndraTaskService`, `FurIndraService`, `SicovEndpointService`). There's no repository layer — raw SQL via `pool.query(...)`.
- **SICOV endpoint resolution is dynamic**, not purely config-driven. `SicovEndpointService.resolveSicovEndpointForIndra()` checks a `config_prueba` table (keys `idconfiguracion` 40000 = "alternativo activo" flag, 40001 = alternate URL) on every call. If active, it overrides the `IP_SICOV` env default. `parseHostPort()` accepts either `host`, `host:port`, or a full URL, and builds the `?WSDL` URL plus an optional explicit SOAP `location` override accordingly. Both the cron flow and the FUR flow call this before every send, and both also probe raw TCP connectivity first via `checkSocketConnectivity()` (2s timeout) — if unreachable, the operation is skipped/aborted rather than letting the SOAP call fail/hang.
- **Encryption**: `src/rijndael.ts` implements what the codebase calls "Rijndael128CBC" but is actually AES-256-CBC with manual zero-padding (not PKCS7) via Node's `crypto` module, using a fixed key (`v239pShjXXXXXXXXXXXXXXXXXXXXXXXX`) and IV (`sicovcontacindra`) hardcoded inline in both `eventos-indra-task.service.ts` and `fur-indra.service.ts`. Payloads are `|`-delimited strings encrypted before being sent over SOAP.
- **SOAP client**: `src/sicov-soap.ts` wraps the `soap` package with two thin functions, `enviarEventosSicov` and `enviarFurSicov`, each creating a fresh SOAP client per call against the resolved WSDL URL (optionally overriding the endpoint via `client.setEndpoint(location)` when a full alternate URL was configured). `enviarFurSicov` additionally sets an `X-Service-Version: 19` HTTP header.
- **Legacy data handling**: in the cron task, `eventosindra.cadena` may already be `|`-delimited plaintext or may need decrypting first (`datos_.length === 1` check) — a backward-compatibility branch for older stored rows. Events whose third field is `'Ruidos'` are intentionally skipped (not forwarded to SICOV).
- **Module wiring**: `AppModule` imports `ScheduleModule.forRoot()` (enables `@Cron`) and `FurIndraModule`; `SicovEndpointService` is provided both at the app level and re-provided inside `FurIndraModule` (two separate DI instances — stateless service, so this is harmless but worth knowing if you add state to it).
- Path imports mix relative (`../rijndael`) and `src/`-rooted (`src/db`, `src/sicov-soap`) styles inconsistently — `baseUrl: "./"` in `tsconfig.json` makes both resolve from the repo root.
