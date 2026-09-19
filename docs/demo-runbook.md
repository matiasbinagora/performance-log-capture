# Performance log capture demo runbook

Run every command from the repository root.


## Evidence boundary and dependencies

**Direct evidence** is an observable command result, file, test, or checked-in
contract. **Explanatory inference** is narration connecting independent manual
actions; it is not proof of an automatic handoff.

PER-24 through PER-30 are implemented on the current main line. PER-31
(Archify visual documentation) was reviewed and QA-verified, merged into main
through GitHub PR #8, and is complete; Linear PER-31 is Done. Its diagrams and
commands are released on the current main line.

The demo is local and requires no AWS access, AWS credentials, database,
accounts, Linear credentials, GitHub credentials, or other secret. The
performance and logging agents must not use Linear or GitHub tools.

## 1. Clean setup

Prerequisites:

- macOS and a desktop browser.
- Node.js 22 or newer and npm.
- Docker Desktop with Docker Compose.
- Python 3 only for optional local HTTP viewing.
- uv and graphify only for optional Graphify evidence.
- Chromium installed through Playwright only for browser evidence.

Confirm the runtime and install from the lockfile:

```bash
node --version
npm --version
docker --version
docker compose version
npm ci
```

The repository declares Node.js >=22. No environment file is required. Do not
create a secrets file. The application has no AWS integration and makes no AWS
calls.

## 2. Docker startup, health, and cleanup

```bash
PORT=3000 docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:3000/health
curl --fail "http://127.0.0.1:3000/products/search?q=desk"
curl --fail http://127.0.0.1:3000/products/aurora-desk-lamp
curl --include http://127.0.0.1:3000/products/unknown-product
```

Direct evidence: docker compose ps should show catalog running/healthy. The
health request should return HTTP 200 with {"status":"ok"}. Search and known
detail return deterministic JSON; unknown detail returns HTTP 404 with
PRODUCT_NOT_FOUND. Exact latency and ordering are evidence from the current
run, not fixed promises.

If port 3000 is occupied:

```bash
PORT=3100 docker compose up --build -d
curl --fail http://127.0.0.1:3100/health
```

For a failed start, collect evidence before cleanup:

```bash
docker compose ps
docker compose logs catalog
docker compose down --remove-orphans
```

Stop a successful session with:

```bash
docker compose down --remove-orphans
```

This removes the local Compose container and network, not source files or run
artifacts.


## 3. Performance agent

Keep the catalog running and verify /health. The agent may write local run
artifacts only; it must not edit product code or use Linear, GitHub, AWS,
Graphify, or the dashboard.

Paste this exact English prompt into the local performance-agent:

```text
Run one bounded, reproducible local performance test against the catalog. Work only in the repository and do not edit application source code or use Linear, GitHub, AWS, Graphify, or external services. Confirm that Node.js 22 or newer, npm dependencies, and http://localhost:3000/health are ready. Execute exactly this default profile: 60 seconds, 20,000 requests, concurrency 20, a 10-second ramp, catalog scenario, seed 42, and a 0.02 error rate. Use the command below and preserve the generated run directory:

npm run performance:run -- --base-url http://localhost:3000 --scenario catalog --requests 20000 --concurrency 20 --duration-seconds 60 --ramp-seconds 10 --seed 42 --error-rate 0.02 --output runs

When it finishes, report the repository-relative run directory, the status from summary.json, the four artifact paths, actual versus requested request counts, operation distribution, success/error counts and rate, latency average/p50/p95/p99/max, throughput, and the exact logging-agent handoff command. If interrupted, report status incomplete and a non-zero result; never call an incomplete run successful.
```

Direct command:

```bash
npm run performance:run -- --base-url http://localhost:3000 --scenario catalog --requests 20000 --concurrency 20 --duration-seconds 60 --ramp-seconds 10 --seed 42 --error-rate 0.02 --output runs
```

For a bounded smoke check, use a separate directory; it is not default demo
evidence:

```bash
npm run performance:run -- --base-url http://localhost:3000 --scenario catalog --requests 20 --concurrency 4 --duration-seconds 10 --ramp-seconds 1 --seed 42 --error-rate 0.02 --output smoke-runs
```

The separate smoke directory validates only the runner command path. Use
`--output runs` for the logging-agent and dashboard handoff because the
dashboard validates the canonical `runs/<run-id>/` artifact relationship.

Each invocation creates a new runs/<run-id>/ directory and never overwrites an
earlier run. A complete run contains:

```text
runs/<run-id>/config.json
runs/<run-id>/requests.jsonl
runs/<run-id>/application.log
runs/<run-id>/summary.json
```

summary.json records actual/requested counts, operation distribution, duration,
success/error counts and rate, average/p50/p95/p99/max latency, error codes, and
throughput.requestsPerSecond. The JSONL and application log contain per-request
evidence. The command prints the run directory and the exact next logging-agent
command. Read actual values from those files; do not invent metrics. Ctrl-C
marks the summary incomplete and returns non-zero.

## 4. Logging agent

The input is one run directory with all four performance artifacts. The agent
must stream requests.jsonl, not paste the complete log into model context.

Paste this exact prompt into logging-agent, replacing <run-id>:

```text
Analyze the completed local performance run at runs/<run-id>. Work only in the repository and do not edit application source code or use Linear, GitHub, AWS, or external services. First verify that config.json, requests.jsonl, application.log, and summary.json are present. Run exactly:

npm run log-analysis -- --input runs/<run-id> --output runs/<run-id>/<run-id>-analysis.json

Read the compact JSON result, including its status and exit code. Report measured facts separately from derived findings and hypotheses: request volume, operation distribution, success/failure counts, status-code and error distributions, average/p50/p95/p99/max latency, throughput, interruption state, validation issues, and up to three source-traceable success, slow, and error examples. If Graphify is available, query the search handler, intentional delay, and error branch, save the command output under graphify-out/evidence/, and rerun the analyzer with --graphify-evidence <path>. If Graphify is unavailable, report exactly “code evidence unavailable” and retain the measured analysis. Do not claim a source-level root cause from measurements alone. Print the generated dashboard path and hand off to the dashboard step.
```

Direct command:

```bash
npm run log-analysis -- --input runs/<run-id> --output runs/<run-id>/<run-id>-analysis.json
```

Exit codes are direct evidence: 0 complete; 2 invalid or incomplete input
(read the output and do not report passing results); 1 analyzer failure. The
analysis JSON contains facts, metrics, examples, issues, derivedFindings,
hypotheses, graphify, and dashboardPath. Show total, success/failure, error
rate, operation metrics, status/error distributions, average/p50/p95/p99/max
latency, throughput, interruption state, and selected source-line examples.
Measured facts, analyzer findings, and hypotheses must remain distinct.
Incomplete input has no derived findings.


### Graphify available and unavailable paths

Graphify is optional. When available:

```bash
uv tool install graphifyy
graphify --version
npm run graphify:index
npm run graphify:inspect
mkdir -p graphify-out/evidence
npm run graphify:search -- "search handler intentional delay error" \
  | tee graphify-out/evidence/graphify-search.txt
npm run log-analysis -- --input runs/<run-id> \
  --output runs/<run-id>/<run-id>-analysis.json \
  --graphify-evidence graphify-out/evidence/graphify-search.txt
```

Show the ignored graphify-out/evidence/graphify-search.txt, repository-relative
paths, and line references. This is code context for a measured observation,
not proof of causal root cause.

If Graphify is unavailable or indexing fails, retain the measured analysis and
record exactly: code evidence unavailable. Do not block the dashboard or
invent a source explanation.

## 5. Dashboard generation and opening

Generate inside the run directory:

```bash
npm run dashboard:generate -- \
  --input runs/<run-id>/<run-id>-analysis.json \
  --output runs/<run-id>/dashboard.html
```

The result is one self-contained HTML file with inline CSS, JavaScript, and SVG;
it needs no CDN, network, or AWS.

Validation note for the current dependency line: the analyzer currently emits
absolute paths in its generated JSON, while the dashboard validator requires
repository-relative runs/<run-id>/ paths. Therefore the real-run command can
return exit 2 with ARTIFACT_RELATIONSHIP_MISMATCH until that dependency contract
is corrected. This is a verified limitation of the existing PER-27/PER-28
implementation, not a successful dashboard result. Do not hide the warning or
edit product code as part of this documentation task.

To verify the dashboard renderer and opening path on the current branch, use
the checked-in complete fixture and an ignored local output:

```bash
npm run dashboard:generate -- \
  --input fixtures/dashboard-analysis.json \
  --output runs/dashboard-fixture.html
open runs/dashboard-fixture.html
```

The fixture command returns status complete and is suitable for verifying the
dashboard charts and tables. The generated file is local evidence only and
must be removed or left ignored; it is not a replacement for fixing the
real-run contract.

Open on macOS through the filesystem:

```bash
open runs/<run-id>/dashboard.html
```

If file navigation is restricted, serve only that run directory locally:

```bash
python3 -m http.server 4174 --directory runs/<run-id>
open http://127.0.0.1:4174/dashboard.html
```

Stop that server with Ctrl-C.

A complete report shows headline request/success/failure metrics, success rate,
p50/max latency, throughput, operation table, status/error chips, selected
examples, analyzer findings, hypotheses, run metadata, and the Graphify
boundary. The standard chart areas are latency over time, successful versus
failed, detail versus search, and errors over time.

When timestamped observations are absent, time-series charts explicitly show
insufficient data rather than an invented trend. Missing operation values show
Unavailable; a measured zero remains zero. An incomplete report visibly says
This run is incomplete, lists warnings and source issues, suppresses derived
findings, and says no metrics were invented. Invalid input produces a visible
unavailable state and exit 2.

Compare displayed values with the analysis JSON. A plain-English user-impact
statement or likely cause is explanatory inference or a hypothesis, not a raw
measurement.

## 6. Archify (PER-31)

PER-31 was reviewed and QA-verified, merged into main through GitHub PR #8, and
is complete; Linear PER-31 is Done. The Archify files and commands are
available on the current main line. Run:

```bash
npm run archify:build
npm run archify:validate
npm run archify:verify
```

Expected post-merge outputs:

```text
docs/archify/architecture.html
docs/archify/manual-demo-sequence.html
```

Open directly or through a local-only server started from the repository root:

```bash
open docs/archify/architecture.html
open docs/archify/manual-demo-sequence.html
python3 -m http.server 4174 --directory .
open http://127.0.0.1:4174/docs/archify/architecture.html
open http://127.0.0.1:4174/docs/archify/manual-demo-sequence.html
```

The exact browser URLs for the two diagrams are:

```text
http://127.0.0.1:4174/docs/archify/architecture.html
http://127.0.0.1:4174/docs/archify/manual-demo-sequence.html
```

Serving the repository root is required because the generated diagram links
use paths such as `../../src/...` from pages under `docs/archify/`. Verify these
representative directory links and source-reference links in the same browser;
each should resolve successfully with HTTP 200 or 304:

```text
http://127.0.0.1:4174/src/
http://127.0.0.1:4174/scripts/
http://127.0.0.1:4174/tests/
http://127.0.0.1:4174/docs/
http://127.0.0.1:4174/openspec/
http://127.0.0.1:4174/.github/workflows/
http://127.0.0.1:4174/src/performance/runner.ts
http://127.0.0.1:4174/scripts/performance-run.ts
http://127.0.0.1:4174/tests/e2e/dashboard.spec.ts
http://127.0.0.1:4174/docs/graphify-demo.md
http://127.0.0.1:4174/openspec/changes/performance-log-capture/specs/archify-documentation/spec.md
http://127.0.0.1:4174/.github/workflows/per-30-playwright-evidence.yml
```

Show the component architecture, then the manual sequence from performance
agent through logging agent, Graphify, dashboard, Playwright, and the
GitHub/Linear handoff. Verify every linked repository-relative path. The
diagrams label direct evidence and explanatory inference separately.


## 7. Reset and recovery

### Safe reset

Inspect before starting or archiving:

```bash
find runs -maxdepth 2 -type f -print | sort
```

Use the same --output runs command to create a fresh generated ID. Never reuse
an ID or overwrite an artifact. To retain a known old run while clearing the
active list, move only that directory:

```bash
mkdir -p runs/archive
mv runs/<run-id> runs/archive/<run-id>
```

Do not commit runs, dashboards, Graphify output, screenshots, traces, reports,
or videos.

### Interrupted run

Press Ctrl-C once and allow in-flight requests to finish:

```bash
cat runs/<run-id>/summary.json
```

Verify the summary status is incomplete and keep the directory as recovery
evidence; never call it passing. Start a new run. An incomplete analysis should
return exit 2 and contain no derived findings.

### Docker or Playwright failure

Capture Docker diagnostics before restarting:

```bash
docker compose ps
docker compose logs catalog
docker compose down --remove-orphans
PORT=3000 docker compose up --build -d
curl --fail http://127.0.0.1:3000/health
```

For browser evidence:

```bash
npx playwright install chromium
npm run test:e2e
npx playwright show-report
docker compose down --remove-orphans
```

Playwright writes ignored test-results/ and playwright-report/; inspect failure
videos, screenshots, traces, server logs, and test output before cleanup. CI
also exposes playwright-artifacts/run-metadata.json and the uploaded evidence
artifact. A failed test is failure evidence, never a passing QA result. If
interrupted, confirm no server remains on the configured port before rerunning.

## 8. Evidence walkthrough

1. **Linear:** show the performance-log-capture project and PER-24 through
   PER-32. Show PER-31 as Done after review and QA verification.
2. **GitHub:** show the repository tree and relevant src/, scripts/, docs/,
   tests/, and OpenSpec files, then the dependency PRs. Do not imply a PR is
   merged unless GitHub shows it as merged; PR #8 is the PER-31 boundary.
3. **Performance:** show runs/<run-id>/summary.json, selected JSONL examples,
   and application.log; keep the complete log out of model context.
4. **Logging:** show analysis JSON, exit status, source line references,
   findings, hypotheses, and Graphify status.
5. **Graphify:** show graphify-out/evidence/graphify-search.txt, returned
   paths/lines, or the unavailable fallback.
6. **Dashboard:** open runs/<run-id>/dashboard.html via filesystem or local
   HTTP and compare it with analysis JSON.
7. **Archify:** open both docs/archify/ diagrams through the documented
   repository-root server, show their evidence legend and links, and verify the
   representative HTTP URLs above.
8. **Playwright:** show playwright-report/, relevant test-results/ videos,
   screenshots, traces, and logs; for CI show playwright-artifacts/, metadata,
   workflow run, and uploaded artifact. Keep videos outside Git history.
9. **Handoff:** show GitHub and Linear comments with commit, checks, evidence,
   limitations, and next step. Merge and Done remain manual gates.

Repository files and command output are direct evidence. The narrated sequence
between systems and agents is explanatory inference unless explicitly recorded
by an artifact.

## 9. Validation checklist

On the current branch, execute:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run openspec:validate
git diff --check
```

Also execute and record the Docker start/health/cleanup sequence, bounded
performance smoke, logging against complete and incomplete input, dashboard
filesystem/HTTP opening, and Graphify available/unavailable paths. Execute the
full 60-second/20,000-request profile when appropriate for the recording.

Run the three Archify commands and the documented repository-root HTTP opening
and source-link checks in the same clean validation pass. Never report a check
as passed unless it ran; record Docker, Chromium, or Graphify limitations
explicitly.
