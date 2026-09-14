# Performance Log Capture

This repository contains the local catalog application used by the performance
and log-analysis demo. It provides a deterministic in-memory catalog, a JSON
API, Docker packaging, and a small browser UI. It does not require a database,
credentials, or external services.

## Requirements

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose for the container workflow

## Install

```bash
npm ci
```

No `.env` file is required for the catalog application. The existing
`.env.example` documents development-tool credentials only; never commit real
values.

## Develop

Start the TypeScript server in watch mode:

```bash
npm run dev
```

The application listens on `http://localhost:3000` by default. `PORT` and
`HOST` can be set explicitly when needed.

## Test and build

Run the backend validation commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Start the compiled application without Docker:

```bash
npm run build
npm start
```

Validate the OpenSpec change:

```bash
npm run openspec:validate
```

## Docker start and stop

Build and start the catalog:

```bash
docker compose up --build
```

Open `http://localhost:3000` or verify the API from another terminal:

```bash
curl --fail http://localhost:3000/health
curl --fail "http://localhost:3000/products/search?q=desk"
curl --fail http://localhost:3000/products/aurora-desk-lamp
curl --include http://localhost:3000/products/unknown-product
```

Stop and remove the local container:

```bash
docker compose down
```

To use a different host port, set `PORT` for Compose, for example
`PORT=3100 docker compose up --build`.

## API contract

### `GET /health`

Returns HTTP 200:

```json
{"status":"ok"}
```

### `GET /products/:id`

Returns a deterministic product inside a `product` property. Unknown IDs use
the shared error shape and HTTP 404:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product 'unknown-product' was not found.",
    "statusCode": 404
  }
}
```

### `GET /products/search?q=<term>`

Trims and normalizes the query, then returns stable product ordering for the
same term. A missing or blank `q` returns HTTP 400 with the same error shape.

## Browser UI

Open `http://localhost:3000` in a desktop browser. Search for a product or
category such as `desk` or `office`, then select **View details**. The page
uses same-origin API requests and visibly reports loading, empty, and error
states without external services.

## Performance scenario configuration

The application reads these optional environment variables. Defaults are
safe for local development and the request limit and duration have hard upper
bounds to prevent accidental unbounded runs:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `SCENARIO` | `catalog` | Selects the local catalog scenario. |
| `SEARCH_DELAY_MS` | `250` | Intentional delay applied only to search. Maximum `60000`. |
| `SEARCH_ERROR_RATE` | `0.02` | Deterministic search failure rate from `0` to `1`. |
| `LOAD_DURATION_SECONDS` | `60` | Future load-run duration. Maximum `3600`. |
| `TARGET_REQUESTS` | `20000` | Future load-run target. Maximum `100000`. |
| `RANDOM_SEED` | `42` | Seed used to choose search failures. |
| `RUN_ID` | `local` | Safe identifier included in request events. |

For example, run a readable failing scenario locally with:

```bash
SEARCH_DELAY_MS=100 SEARCH_ERROR_RATE=0.1 RANDOM_SEED=7 RUN_ID=demo-1 npm run dev
```

Every completed request emits one JSON object per line to standard output with
`runId`, a unique per-run `requestId`, `operation`, HTTP `status`, measured
`duration`, ISO `timestamp`, and `errorCode` when applicable. Search failures
return HTTP 503 with `SEARCH_SIMULATED_ERROR`. These events can be redirected
to a file for a future performance run without a database or external service.
