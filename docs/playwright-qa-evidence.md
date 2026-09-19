# Playwright QA and video evidence

PER-30 runs deterministic browser checks against the local catalog server and
the standalone PER-28 dashboard. No external services, credentials, or
network data are used by the tests.

## Branch dependency

PER-30 consumes the standalone dashboard implementation from PER-28. Until
PER-28 is merged, the PER-30 pull request is intentionally stacked on
`feature/per-28-standalone-dashboard`; `src/dashboard/dashboard.ts` and its
dashboard unit tests are supplied by the base branch, not by the PER-30
change. The PR must not be presented as independently mergeable into `main`
before PER-28 is merged.

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

Playwright writes videos, screenshots, and traces for every test under
`test-results/`. The HTML report is written to
`playwright-report/` and can be opened with `npx playwright show-report`.
These generated paths are ignored by Git.

CI also writes `playwright-artifacts/run-metadata.json`, recording the commit,
Chromium, command, and numeric test result. The workflow derives one canonical
commit value as `${{ github.event.pull_request.head.sha || github.sha }}` and
passes it as `PLAYWRIGHT_COMMIT`. Pull-request runs therefore use the actual PR
head SHA, while push or other non-pull-request runs use `github.sha`. The
metadata writer requires that explicit value and rejects missing or malformed
SHAs; it never falls back to `GITHUB_SHA` or a local placeholder. The Docker tag,
artifact filename, and metadata all use this same canonical SHA. The workflow
builds and starts the Docker Compose application before running the suite; local
execution uses the same compiled application contract through the
Playwright-managed HTTP server.

On pull requests or manual dispatch, GitHub Actions uploads both directories
as `PER-30-playwright-evidence-<canonical commit SHA>` with a 14-day retention period.
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
