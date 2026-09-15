## 1. Repository and runtime foundation — PER-24

- [x] 1.1 Create the Node.js and TypeScript project files with scripts for development, testing, and production start.
- [x] 1.2 Add the deterministic local product dataset and catalog domain types.
- [x] 1.3 Implement `GET /health`, `GET /products/:id`, and `GET /products/search?q=<term>` with consistent JSON errors.
- [x] 1.4 Build the minimal browser catalog page with search, results, detail, loading, and error states.
- [x] 1.5 Add Dockerfile and Docker Compose configuration that starts the app with one documented command.
- [x] 1.6 Add unit/API tests for health, detail, search, 404 behavior, and deterministic results.
- [x] 1.7 Validate the container and browser UI, then record commands and commit hash for PER-24.

## 2. Deterministic performance behavior — PER-25

- [x] 2.1 Add configuration parsing and validation for delay, error rate, duration, target requests, and random seed.
- [x] 2.2 Implement the search-only intentional delay with a documented timing tolerance.
- [x] 2.3 Implement seeded deterministic search errors with a non-zero readable default rate.
- [x] 2.4 Add request ID and run ID propagation to every structured JSONL request event.
- [x] 2.5 Add request log fields for operation, status, duration, timestamp, and error code.
- [x] 2.6 Add tests proving detail is fast, search is delayed, and identical seeds reproduce outcomes.
- [x] 2.7 Run identical and different-seed scenarios and attach redacted evidence to PER-25.

## 3. Performance run artifacts — PER-26

- [ ] 3.1 Define the run configuration, request event, summary, and incomplete-run schemas.
- [ ] 3.2 Implement a streaming load runner with gradual ramp-up and the default 60-second/20,000-request profile.
- [ ] 3.3 Create a unique `runs/<run-id>/` directory without overwriting previous runs.
- [ ] 3.4 Persist `config.json`, `requests.jsonl`, `application.log`, and `summary.json` for completed runs.
- [ ] 3.5 Calculate actual counts, operation distribution, duration, error rate, average, p50, p95, p99, and maximum latency.
- [ ] 3.6 Mark interrupted or incomplete runs as `incomplete` and prevent them from being reported as passing.
- [ ] 3.7 Create the local Codex `performance-agent` instructions in English with prerequisites, stop rules, and handoff command.
- [ ] 3.8 Execute two runs and verify unique IDs, preserved artifacts, and correct summary values.

## 4. Log analysis pipeline — PER-27

- [ ] 4.1 Implement streaming parsers and schema validation for complete run artifacts.
- [ ] 4.2 Implement metric aggregation by operation and overall run.
- [ ] 4.3 Select representative success, slow, and error examples without loading the complete log into model context.
- [ ] 4.4 Implement incomplete-input handling that reports missing or malformed files without invented conclusions.
- [ ] 4.5 Create the local Codex `logging-agent` instructions in English with input, commands, evidence rules, and output contract.
- [ ] 4.6 Add the Graphify query handoff for the search handler, delay, and error branch.
- [ ] 4.7 Analyze complete and incomplete fixtures and record stable output evidence for PER-27.

## 5. Standalone dashboard — PER-28

- [ ] 5.1 Define the report data contract between `summary.json`, analysis output, and HTML generation.
- [ ] 5.2 Implement evidence-first layout with headline metrics and plain-English user impact.
- [ ] 5.3 Add charts for latency over time, detail versus search, success versus failure, and errors over time.
- [ ] 5.4 Add operation table, selected log examples, Graphify references, run metadata, and analyzed commit.
- [ ] 5.5 Bundle or inline all chart assets so the report has no runtime network dependency.
- [ ] 5.6 Render an explicit incomplete state when source data is incomplete or code evidence is unavailable.
- [ ] 5.7 Add fixture tests for representative displayed values and open the report from the filesystem.

## 6. Graphify integration — PER-29

- [ ] 6.1 Document installation or invocation of `Graphify-Labs/graphify` for this repository.
- [ ] 6.2 Generate the repository graph without changing product behavior.
- [ ] 6.3 Run a reproducible query from the logging workflow to the search handler and intentional behavior.
- [ ] 6.4 Save the query/result reference and connect it to the dashboard diagnosis.
- [ ] 6.5 Add the unavailable-Graphify fallback and verify the report labels code evidence unavailable.

## 7. Playwright QA and video evidence — PER-30

- [x] 7.1 Configure Playwright against the Dockerized application and standalone dashboard.
- [x] 7.2 Add tests for catalog load, search success, product detail, simulated search error, and dashboard opening.
- [x] 7.3 Add a test for incomplete-report messaging and offline report rendering.
- [x] 7.4 Configure video recording and capture commit, browser, command, and result metadata.
- [x] 7.5 Implement or document uploading the video for playback inside the GitHub PR/issue.
- [x] 7.6 Implement or document attaching the same video for playback inside the Linear task.
- [x] 7.7 Publish English QA evidence through `github_qa` and `linear_qa`; keep videos out of Git history.
- [x] 7.8 Verify a failing test blocks a passing QA report and a passing run opens from both platforms.

## 8. Archify documentation — PER-31

- [ ] 8.1 Add the Archify setup and invocation instructions in English.
- [ ] 8.2 Generate the component architecture diagram with source/documentation references.
- [ ] 8.3 Generate the manual demo sequence diagram from performance agent to logging agent to QA evidence.
- [ ] 8.4 Distinguish direct evidence from explanatory inference in the diagrams and supporting text.
- [ ] 8.5 Open and validate all diagrams locally for the video walkthrough.

## 9. Demo runbook — PER-32

- [ ] 9.1 Document clean setup, Docker start, browser check, and default load profile.
- [ ] 9.2 Add the exact English prompt and expected output for `performance-agent`.
- [ ] 9.3 Add the exact English prompt and expected output for `logging-agent`.
- [ ] 9.4 Document run reset, interrupted-run recovery, and dashboard opening.
- [ ] 9.5 Document where to show Linear stories, GitHub code, Graphify output, and Archify diagrams.
- [ ] 9.6 Execute the runbook from a clean local state and fix ambiguous steps.

## 10. OpenSpec and Linear traceability — PER-33

- [ ] 10.1 Link each Linear story PER-24 through PER-33 to this OpenSpec change and its capability spec.
- [ ] 10.2 Keep implementation tasks and acceptance criteria synchronized with the approved design.
- [ ] 10.3 Verify the real Linear workflow mapping: Backlog, Todo, In Progress, In Review, and Done.
- [ ] 10.4 Document that the orchestrator recommends Todo, developers implement in In Progress, reviewers use In Review, and the user owns Done and merge.
- [ ] 10.5 Run OpenSpec validation before the first implementation handoff and before review handoffs.
- [ ] 10.6 Preserve completion evidence and next steps in the corresponding Linear task comments.

## 11. Cross-cutting review gates

- [ ] 11.1 Confirm no secrets, `.env` files, generated videos, or temporary Graphify/brainstorm artifacts are tracked.
- [ ] 11.2 Confirm performance and logging demo agents have no Linear or GitHub tool access.
- [ ] 11.3 Confirm developer handoffs include tests, OpenSpec validation, branch/commit, and exact evidence.
- [ ] 11.4 Confirm code review is independent and comments are posted under the reviewer GitHub App.
- [ ] 11.5 Confirm QA comments and video evidence are posted under the assigned GitHub and Linear identities.
- [ ] 11.6 Confirm final `Done` transition and GitHub merge remain manual user actions.
