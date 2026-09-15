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

## Standalone performance dashboard

Generate the offline report from the JSON output of the PER-27 analyzer:

```bash
npm run dashboard:generate -- --input runs/<run-id>/<run-id>-analysis.json \
  --output runs/<run-id>/dashboard.html
```

For the deterministic demo fixture:

```bash
npm run dashboard:generate -- --input fixtures/dashboard-analysis.json \
  --output /tmp/performance-dashboard.html
open /tmp/performance-dashboard.html
```

The input contract is PER-27 analysis JSON with `schemaVersion: 1`, `status`,
`runId`, `facts`, `metrics`, `examples`, `issues`, `derivedFindings`,
`hypotheses`, and `graphify`. Raw counts and distributions are shown separately
from analyzer findings. Optional `config.commit` and `config.scenario` values
are shown as metadata; missing values are displayed as “not provided”.

The generated artifact is one HTML file with inline CSS, JavaScript, and SVG.
It opens directly from the filesystem without a server, build step, CDN, or
network connection. Latency is in milliseconds and throughput is requests per
second. Status-code and error chips provide exact counts behind the charts.

Complete reports show measured metrics and derived findings. Incomplete reports
show warnings, interruption/timeout state, and source issues while omitting
derived conclusions. Invalid JSON/schema input produces a visible unavailable
state and the CLI exits `2`; complete and incomplete documents write an artifact
and exit `0`. Unexpected filesystem failures exit `1`. Input values are escaped
before insertion into the page.

Known limitations: PER-27 currently provides aggregate metrics rather than
per-request time-series data, so time-series visuals use deterministic
aggregate samples. Graphify is a later PER-29 integration; unavailable code
evidence is shown explicitly and is never turned into a root-cause claim.
