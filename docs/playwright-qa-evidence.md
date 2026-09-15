# Playwright QA and video evidence

PER-30 runs deterministic browser checks against the local catalog server and
the standalone PER-28 dashboard. No external services, credentials, or
network data are used by the tests.

## Local execution

Install dependencies and the Chromium browser once:

```bash
npm ci
npx playwright install chromium
```

Run the headless suite (the configured web server builds the app and creates
the fixture reports automatically):

```bash
npm run test:e2e
```

Run headed, or inspect with the Playwright UI mode:

```bash
npm run test:e2e:headed
npx playwright test --ui
```

The dashboard can also be started manually after `npm run build` with
`HOST=127.0.0.1 PORT=4173 npx tsx src/server.ts`; generate a report with
`npm run dashboard:generate -- --input fixtures/dashboard-analysis.json
--output public/report.html` and open it at `http://127.0.0.1:4173/report.html`.
The QA config uses a local HTTP URL instead of `file://` because browser
policies can restrict local-file navigation.

## Evidence

Playwright writes videos for every test under `test-results/`, screenshots on
failure, and traces on failure or retry. The HTML report is written to
`playwright-report/` and can be opened with `npx playwright show-report`.
These generated paths are ignored by Git.

CI also writes `playwright-artifacts/run-metadata.json`, recording the commit,
Chromium, command, and numeric test result. The workflow builds and starts the
Docker Compose application before running the suite; local execution uses the
same compiled application contract through the Playwright-managed HTTP server.

On pull requests or manual dispatch, GitHub Actions uploads both directories
as `PER-30-playwright-evidence-<commit SHA>` with a 14-day retention period.
The GitHub connector exposes Actions artifacts, not inline PR/Linear media
embedding; the canonical artifact URL must therefore be posted in the PR and
Linear handoff comments for playback.

## Scope and troubleshooting

The suite covers catalog initial load, deterministic search, product detail,
simulated search failure, dashboard metrics/tables, real-data charts,
unavailable/incomplete states, zero values, zero-request semantics, and safe
HTML rendering. Workers are limited to one and CI retries are two to keep
videos and fixture data deterministic.

If Chromium is missing, run `npx playwright install chromium` (or
`npx playwright install --with-deps chromium` on Ubuntu). If port 4173 is in
use, stop the existing server or change `baseURL`, `webServer.url`, and the
server command together. Docker remains the supported application runtime;
the CI harness uses the equivalent compiled local HTTP server so clean
checkouts do not require Docker credentials or a daemon.
