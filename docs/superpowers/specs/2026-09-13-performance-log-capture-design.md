# Performance Log Capture — Product Design and Story Specification

Status: Draft for user review  
Language: English  
Repository: `matiasbinagora/performance-log-capture`  
Execution mode: local Docker demo  

## Product goal

Build a small product catalog that makes one performance problem easy to
reproduce and explain. A manual Codex performance agent generates a controlled
load test. A separate manual Codex logging agent analyzes the resulting files,
uses Graphify to locate the relevant code, and creates an offline HTML report.
The audience is non-technical, so the report must lead with measured evidence
and explain the result in plain English.

The demo does not fix the simulated problem. It demonstrates how an agent can
turn a large set of logs into an understandable diagnosis.

## Fixed product decisions

- The first release runs locally with Docker; AWS Lambda and CloudWatch are out
  of scope.
- The application is a small catalog with a minimal browser UI, product detail,
  search, and health check.
- Product detail is the fast reference operation.
- Search includes a configurable, intentional delay and a configurable,
  deterministic error rate.
- The default load profile is 20,000 requests over 60 seconds with a fixed
  random seed.
- Each run writes isolated artifacts under `runs/<run-id>/`.
- The logging agent processes complete files with scripts and receives compact
  summaries plus selected examples.
- The final report is a self-contained HTML file that opens without a server.
- All user-facing documentation, stories, comments, reports and diagrams are
  written in English.
- Performance and logging agents are local Codex agents and do not use Linear
  or GitHub.

## Delivery workflow

Stories use this sequence:

`Backlog → Planned → In Progress → Under Review → QA verification → Ready to Release → Done`

The orchestrator recommends a story for `Planned`. Once the user approves that
recommendation, the backend developer is activated and moves the story to
`In Progress`. The developer moves it to `Under Review` after implementation.
The code reviewer validates the implementation, leaves factual comments on the
GitHub pull request, and moves an approved story to `QA verification`. QA
automation adds or updates tests, runs the acceptance checks, records the video
evidence, and moves a passing story to `Ready to Release`. The user performs
the final review, moves the story to `Done`, and merges the GitHub pull request
manually.

The automatic transitions are allowed only when the preceding role has
provided its required evidence. No agent may move a story to `Done` or merge a
pull request.

## Story execution contract

Every developer story must leave the repository runnable, include tests for
the changed behavior, and report exact commands and results. Every QA story
must read the complete issue or pull request first, validate the acceptance
criteria, record evidence, and publish a video comment or attachment in both
GitHub and Linear. Code review is independent from developer self-checks.

The agents must not silently broaden scope, replace the chosen stack, remove
determinism, commit secrets, or mark work complete without evidence.

## Story 1 — Bootstrap the local catalog application

**Owner:** `global-backend-developer` and `global-frontend-developer`  
**GitHub connection:** `github_developer`  
**Dependencies:** none  
**Goal:** Provide the smallest usable catalog application and Docker workflow.

### Implementation instructions

- Choose a simple Node.js and TypeScript stack, preferably Fastify or an
  equivalent lightweight HTTP framework.
- Keep the product dataset deterministic and local. No database, login,
  payments or external API is needed.
- Implement `GET /health`, `GET /products/:id`, and
  `GET /products/search?q=<term>`.
- Add one browser page with a search field, product results, product detail,
  loading state and visible error state.
- Add Docker configuration and a documented command that starts the app.
- Return JSON from API endpoints and use consistent error responses.

### Acceptance criteria

- `docker compose up --build` starts the application successfully.
- `GET /health` returns HTTP 200 and a JSON success response.
- A known product can be opened from the UI and through the detail endpoint.
- Search returns deterministic results for the same query.
- An unknown product returns HTTP 404 with a useful JSON error.
- The UI works in a normal desktop browser without external services.
- The README documents install, start, test and stop commands in English.
- No credential, `.env` file or generated secret is tracked.

### Required validation evidence

Run the unit/API tests, start the Docker stack, call all three endpoints, and
use Playwright for one successful search, one product detail view and one error
state. Record the exact commands and commit hash in the developer handoff.

### Out of scope

Authentication, persistence, pagination, production deployment and visual
polish beyond a clear demo UI.

## Story 2 — Add deterministic performance scenarios

**Owner:** `global-backend-developer`  
**GitHub connection:** `github_developer`  
**Dependencies:** Story 1  
**Goal:** Make the performance symptoms controlled, visible and repeatable.

### Implementation instructions

Add configuration with safe defaults for `SEARCH_DELAY_MS`, `SEARCH_ERROR_RATE`,
`LOAD_DURATION_SECONDS`, `TARGET_REQUESTS`, and `RANDOM_SEED`. Apply the delay
only to search. Use the seed to decide which search requests fail; the same
configuration must produce the same error selection. Use structured logs for
every request with `runId`, `requestId`, operation, status, duration, timestamp,
and error code where applicable.

### Acceptance criteria

- Detail requests do not receive the search delay.
- Search requests show the configured delay within a documented tolerance.
- Error outcomes are reproducible with the same seed and configuration.
- Error outcomes change when the seed changes.
- The default error rate is non-zero but low enough for a readable demo.
- Every request has a unique request ID within a run.
- Logs are newline-delimited JSON and contain no secrets.
- A test proves the delay and deterministic error behavior.

### Required validation evidence

Run two identical scenario tests and compare their summary values. Run a test
with a different seed and show that the error distribution changes. Include
sample redacted log lines in the handoff.

## Story 3 — Create the performance test agent

**Owner:** `global-orchestrator` for instructions, `global-backend-developer`
for supporting scripts  
**Dependencies:** Stories 1–2  
**Goal:** Let the user manually ask a local Codex agent to generate one complete
performance run.

### Implementation instructions

Create a local Codex agent named `performance-agent` with English instructions.
It must check the app is running, read the run configuration, execute a gradual
60-second load test targeting 20,000 requests, and save all artifacts under a
new run ID. It must not access Linear or GitHub and must not modify application
code during the demo.

### Acceptance criteria

- The agent instructions state prerequisites, command sequence and stop rules.
- The agent creates `config.json`, `requests.jsonl`, `application.log`, and
  `summary.json` for each completed run.
- The summary records actual counts, duration, operation distribution, latency
  percentiles and error count.
- An interrupted run is marked `incomplete` and cannot be reported as passing.
- A completed default run reaches the configured target within documented
  tolerance.
- The agent prints the run directory and exact next command for the logging
  agent.

### Required validation evidence

Execute the agent once end to end and inspect the artifact schema. Execute a
second run and verify it receives a different run ID without overwriting the
first run.

## Story 4 — Create the log analysis agent

**Owner:** `global-orchestrator` for instructions, `global-backend-developer`
for supporting scripts  
**Dependencies:** Stories 2–3  
**Goal:** Let the user manually ask a second local Codex agent to explain one
completed run.

### Implementation instructions

Create a local Codex agent named `logging-agent` with English instructions. It
must refuse incomplete or missing runs, process files through scripts, inspect
the compact summary, select representative examples, and use Graphify to query
the code path behind the slow search. It must distinguish measured facts from
hypotheses and must not edit the application.

### Acceptance criteria

- The agent accepts a run directory as its only required input.
- It validates required files and reports a clear incomplete state when one is
  missing or malformed.
- It calculates request counts, success/error rates, average, p50, p95, p99 and
  maximum latency by operation.
- It identifies search as the slow operation using measured data.
- It identifies the intentional delay and error branch using Graphify evidence.
- It includes file paths and line references where available.
- It never loads the full log into the model context.
- It prints the output dashboard path and a concise English diagnosis.

### Required validation evidence

Analyze a complete fixture and an intentionally incomplete fixture. Verify that
the complete fixture produces stable numbers and that the incomplete fixture is
reported without invented conclusions.

## Story 5 — Generate the standalone performance dashboard

**Owner:** `global-frontend-developer`  
**GitHub connection:** `github_developer`  
**Dependencies:** Stories 3–4  
**Goal:** Present the analysis to a non-technical audience in one offline HTML
file.

### Acceptance criteria

- The dashboard opens from the filesystem without a web server.
- The layout follows the approved evidence-first style.
- It shows total requests, error percentage, typical latency and slowest
  latency as prominent numbers.
- It contains charts for latency over time, detail versus search, successful
  versus failed requests, and errors over time.
- It contains a concise operation table and selected log examples.
- It explains the impact in plain English before technical details.
- It links the conclusion to Graphify code evidence and labels hypotheses.
- It records run ID, duration, configuration and commit analyzed.
- It visibly marks incomplete data and never displays fabricated values.
- All charts and assets are bundled or inline; there are no runtime CDN calls.
- A fixture test verifies representative values rendered in the HTML.

### Required validation evidence

Open the report offline in a clean browser profile, verify all charts render,
and compare displayed numbers with `summary.json`.

## Story 6 — Integrate Graphify code analysis

**Owner:** `global-orchestrator` for workflow, `global-backend-developer` for
integration support  
**Dependencies:** Story 2  
**Goal:** Make code navigation and the demo usage of Graphify reproducible.

### Acceptance criteria

- Graphify is installed or invoked using documented commands from
  `Graphify-Labs/graphify`.
- The repository produces the expected graph artifacts without modifying
  application behavior.
- The logging workflow runs a query that reaches the search handler and the
  intentional delay/error logic.
- The report includes the query or a saved evidence reference.
- The workflow documents what Graphify read locally and what result it returned.
- If Graphify is unavailable, the report says `code evidence unavailable` and
  does not claim a verified root cause.

### Required validation evidence

Run the graph generation and query against the current commit. Save the graph
report outside the application run artifacts or document its location clearly.

## Story 7 — Add Playwright QA and embedded video evidence

**Owner:** `global-qa-manual` and `global-qa-automator`  
**GitHub connection:** `github_qa`  
**Linear connection:** `linear_qa`  
**Dependencies:** Stories 1 and 5  
**Goal:** Validate the user-visible app and report, and publish reproducible
video evidence inside GitHub and Linear.

### Acceptance criteria

- Playwright covers catalog load, search success, product detail, simulated
  search error, dashboard opening and incomplete-report messaging.
- Tests run against the Dockerized application.
- Each QA run records the commit, browser, command and result.
- Playwright records a video for the validation run.
- The video is uploaded so it can be played inside the GitHub PR or issue.
- The same video is attached so it can be played inside the Linear task.
- The GitHub and Linear comments are written in English and include scenario,
  result, evidence location and next step.
- QA reads the complete GitHub PR/issue and Linear task before testing.
- QA uses the assigned GitHub and Linear identities.
- A failing test prevents a passing QA report.

### Required validation evidence

Run the full suite, open the recorded video from both platforms, and verify the
video corresponds to the reported commit. Keep videos out of Git history.

## Story 8 — Create Archify visual documentation

**Owner:** `global-orchestrator`  
**Dependencies:** Stories 1–7  
**Goal:** Explain the system and demo visually in English.

### Acceptance criteria

- Archify documents the component architecture.
- Archify documents the manual sequence from performance agent to logging agent
  to dashboard and QA.
- The diagrams show application, run artifacts, Graphify and Playwright.
- Each diagram links to the relevant source or documentation path.
- The diagrams are viewable locally and are suitable for the demo video.
- The documentation identifies which relationships are direct evidence and
  which are explanatory inference.

## Story 9 — Prepare the manual demo workflow

**Owner:** `global-orchestrator`  
**Dependencies:** Stories 3–8  
**Goal:** Make the video demo easy to perform and repeat.

### Acceptance criteria

- The English runbook contains setup, start, performance-agent prompt,
  logging-agent prompt and dashboard-opening steps.
- It states the expected 60-second/20,000-request profile.
- It explains how to reset runs and how to recover from an interrupted run.
- It shows where to display Linear stories, GitHub code, Graphify output and
  Archify diagrams.
- It contains no secrets and does not require AWS.

## Story 10 — Establish OpenSpec and Linear traceability

**Owner:** `global-orchestrator`  
**Linear connection:** `linear_orchestrator` using
`matiasnj+orquestrator@gmail.com`  
**Dependencies:** approved design and stories 1–9  
**Goal:** Create a traceable backlog and implementation specifications.

### Acceptance criteria

- OpenSpec changes are defined before implementation begins.
- Every Linear story links to its OpenSpec change, owner, dependencies and
  acceptance criteria.
- Linear descriptions and comments are in English.
- The orchestrator reads each task completely before acting.
- The orchestrator verifies the mapped Linear identity before every mutation.
- Each task receives a completion comment with outcome, evidence and next step.
- Only stories approved in this conversation are created in Linear.

## Definition of done

The project is ready for the demo when a clean local setup can run the catalog,
produce the default load run, analyze it with the logging agent, generate the
offline evidence-first dashboard, show Graphify and Archify outputs, and pass
Playwright QA with a video playable from both GitHub and Linear. The two demo
agents remain manually activated and do not interact with either tracker.
