# OpenSpec and Linear traceability index

Change: `performance-log-capture`

This index records the approved Linear stories, their capability specifications,
ownership, dependencies, acceptance-criteria scope, implementation evidence,
independent review evidence, QA evidence, and current final status. The Linear
issue description remains the source of truth for the full acceptance criteria;
the task ranges below identify the synchronized implementation checklist.

## Workflow and evidence policy

The Personal team workflow was verified through `linear_orchestrator` as:

`Backlog` → `Todo` → `In Progress` → `In Review` → `Done`

The orchestrator recommends `Todo`; developers implement in `In Progress`;
independent reviewers and QA use `In Review` because the team has no dedicated
QA or release-ready state; the user owns the final `Done` transition and GitHub
merge. A story is not presented as release-ready without reviewer and QA
evidence. Historical limitations remain marked `NOT VERIFIED` rather than being
converted into claims.

## Story records

### PER-24 — Bootstrap the local catalog application

- OpenSpec: capability `catalog-app`; spec `specs/catalog-app/spec.md`; tasks `1.1–1.7`.
- Owner/connections: `global-backend-developer` and `global-frontend-developer`; `github_developer`.
- Dependencies: none.
- Acceptance criteria: Linear PER-24 acceptance criteria for Docker startup, health/detail/search APIs, deterministic UI behavior, structured 404s, browser usability, and secret-free tracking.
- Implementation evidence: GitHub PR #1, final implementation head `10ebae052ef6b3dea50deb5897198b23380721fb`; merge commit `3d9dfac` is in `origin/main`.
- Review evidence: GitHub reviewer `matias-code-reviewer-agent[bot]` approved PR #1 at exact head `10ebae052ef6b3dea50deb5897198b23380721fb`.
- QA evidence: Linear QA PASS at `10ebae052ef6b3dea50deb5897198b23380721fb`; npm/OpenSpec/Docker/API/Playwright checks passed. GitHub-hosted video artifact publication was later corrected to `NOT VERIFIED`; the WebM is attached to Linear and this does not expand PER-24 scope.
- Final status: Linear `Done`; PR #1 is closed and merge commit `3d9dfac` is present on `origin/main`.

### PER-25 — Add deterministic performance scenarios

- OpenSpec: capability `performance-runs`; spec `specs/performance-runs/spec.md`; tasks `2.1–2.7`.
- Owner/connections: `global-backend-developer`; `github_developer`.
- Dependencies: PER-24 catalog application.
- Acceptance criteria: Linear PER-25 acceptance criteria for search-only delay, seeded reproducible errors, unique request IDs, structured JSONL fields, readable defaults, and tests.
- Implementation evidence: GitHub PR #2, final head `d14aec5424dfd49b48ef794b50ad9826abf81698`; merge commit `15b7442` is in `origin/main`.
- Review evidence: QA recorded reviewer approval on exact head `d14aec5424dfd49b48ef794b50ad9826abf81698`.
- QA evidence: Linear QA automation PASS on that exact head; 23 tests, typecheck, lint, build, strict OpenSpec, Docker/API smoke, deterministic seed comparisons, and secret/artifact scans passed.
- Final status: Linear `Done`; PR #2 is closed and merge commit `15b7442` is present on `origin/main`.

### PER-26 — Create the performance test agent

- OpenSpec: capability `performance-agent`; spec `specs/performance-agent/spec.md`; tasks `3.1–3.8`.
- Owner/connections: `global-orchestrator` for instructions and `global-backend-developer` for support scripts; demo agent has no Linear/GitHub access.
- Dependencies: PER-24 and PER-25.
- Acceptance criteria: Linear PER-26 acceptance criteria for English agent instructions, the four run artifacts, measured summaries, incomplete-run handling, default profile, and logging-agent handoff.
- Implementation evidence: GitHub PR #3; final remediation evidence identifies head `40944f85bcb7665f9ab26a3819b7aae8db089677`; merge commit `74c2dfa` is in `origin/main`.
- Review evidence: QA recorded reviewer approval from `matias-code-reviewer-agent[bot]` on exact head `40944f85bcb7665f9ab26a3819b7aae8db089677`.
- QA evidence: Linear QA PASS with documented Docker/tsx runtime limitations; 19 tests, compiled fixture runs, artifact/run-ID checks, strict OpenSpec, and secret scans passed.
- Final status: Linear `Done`; PR #3 is closed and merge commit `74c2dfa` is present on `origin/main`.

### PER-27 — Create the log analysis agent

- OpenSpec: capability `log-analysis-agent`; spec `specs/log-analysis-agent/spec.md`; tasks `4.1–4.7`.
- Owner/connections: `global-orchestrator` for instructions and `global-backend-developer` for support scripts; demo agent has no Linear/GitHub access.
- Dependencies: PER-25 and PER-26.
- Acceptance criteria: Linear PER-27 acceptance criteria for complete/incomplete validation, metrics, bounded context, measured slow-search findings, Graphify evidence, source references, and dashboard handoff.
- Implementation evidence: GitHub PR #4, exact QA-tested head `adb8364ee49f98286ecc514a203d62f7f9bfc18b`; merge commit `321f754` is in `origin/main`.
- Review evidence: final QA recorded reviewer approval anchored to the exact tested head.
- QA evidence: Linear final independent QA PASS; six files/45 tests, strict OpenSpec, Docker alternate-port health, schema/run-ID/relational-limit checks, incomplete-input behavior, bounded streaming, and secret scan passed. The `tsx` wrapper IPC limitation remains documented.
- Final status: Linear `Done`; PR #4 is closed and merge commit `321f754` is present on `origin/main`.

### PER-28 — Generate the standalone performance dashboard

- OpenSpec: capability `standalone-dashboard`; spec `specs/standalone-dashboard/spec.md`; tasks `5.1–5.7`.
- Owner/connections: `global-frontend-developer`; `github_developer`.
- Dependencies: PER-26 and PER-27.
- Acceptance criteria: Linear PER-28 acceptance criteria for offline evidence-first HTML, metrics, charts, operation comparisons, examples, Graphify links, incomplete states, bundled assets, and fixture coverage.
- Implementation evidence: GitHub PR #5, exact final head `7660af08b6a8857fbb19b6f64cd204d380ec8626`; merge commit `4ee2ceb` is in `origin/main`.
- Review evidence: QA recorded reviewer approval on exact head `7660af08b6a8857fbb19b6f64cd204d380ec8626`.
- QA evidence: Linear final QA PASS; 92 tests, strict OpenSpec, exact seven-file scope, generated-report HTTP/browser checks, malformed/incomplete/zero-request/escaping cases, deterministic output, and console-cleanliness checks passed.
- Final status: Linear `Done`; PR #5 is closed and merge commit `4ee2ceb` is present on `origin/main`.

### PER-29 — Integrate Graphify code analysis

- OpenSpec: capability `graphify-evidence`; spec `specs/graphify-evidence/spec.md`; tasks `6.1–6.5`.
- Owner/connections: `global-orchestrator` for workflow and `global-backend-developer` for integration support; `github_developer` for publication.
- Dependencies: PER-25.
- Acceptance criteria: Linear PER-29 acceptance criteria for reproducible Graphify invocation, search-handler query evidence, sanitized references, dashboard linkage, and truthful unavailable fallback.
- Implementation evidence: GitHub PR #6, exact QA-tested head `e9922f90c715732b719764b09dc0c091d77ba527`; merge commit `e5b315d` is in `origin/main`.
- Review evidence: final QA recorded reviewer approval anchored to the exact tested head.
- QA evidence: Linear final QA PASS; Graphify 0.9.48 indexing/inspect/search, deterministic companion index, sanitization, secret/path scans, strict OpenSpec, and unavailable-index behavior passed. Tasks `6.3–6.4` were explicitly recorded as pending in the historical QA evidence and are not overstated here.
- Final status: Linear `Done`; PR #6 is closed and merge commit `e5b315d` is present on `origin/main`.

### PER-30 — Add Playwright QA and embedded video evidence

- OpenSpec: capability `playwright-qa-evidence`; spec `specs/playwright-qa-evidence/spec.md`; tasks `7.1–7.8`.
- Owner/connections: `global-qa-manual` and `global-qa-automator`; `github_qa` and `linear_qa`.
- Dependencies: PER-24 and PER-28.
- Acceptance criteria: Linear PER-30 acceptance criteria for catalog/dashboard coverage, exact revision metadata, video and artifact evidence, English cross-platform comments, identity checks, and fail-closed QA.
- Implementation evidence: GitHub PR #7, exact QA-tested head `9613e34f09a8ae2588fac44dc571db6e7a653671`; merge commit `b1f070d` is in `origin/main`.
- Review evidence: Linear final QA recorded reviewer approval from `matias-code-reviewer-agent[bot]` on the exact head.
- QA evidence: Linear final release-readiness QA PASS; CI run `35373468913`, exact-head clone, 96/96 tests, Docker-backed Playwright 3/3, artifact ZIP integrity/metadata/media/trace checks, strict OpenSpec, and cleanup scans passed.
- Final status: Linear `Done`; PR #7 is closed and merge commit `b1f070d` is present on `origin/main`.

### PER-31 — Create Archify visual documentation

- OpenSpec: capability `archify-documentation`; spec `specs/archify-documentation/spec.md`; tasks `8.1–8.5`.
- Owner/connections: `global-orchestrator`; publication used the developer GitHub connection recorded in the handoff.
- Dependencies: PER-24 through PER-30.
- Acceptance criteria: Linear PER-31 acceptance criteria for architecture and manual-sequence diagrams, source links, local/offline usability, and direct-evidence versus inference labeling.
- Implementation evidence: GitHub PR #8, exact head `cfcfc74109166c856f1759a6b2a7175ad4d59f3c`; merge commit `a449a12` is in `origin/main`.
- Review evidence: Linear final QA recorded reviewer approval from `matias-code-reviewer-agent[bot]` on the exact head.
- QA evidence: Linear final QA PASS; 96/96 tests, strict Archify build/validate/verify, deterministic diagram hashes, local HTTP/source-link checks, two-theme browser inspection, and secret/artifact scans passed. Upstream Archify CLI unavailability is explicitly documented; the fallback was tested.
- Final status: Linear `Done`; PR #8 is closed and merge commit `a449a12` is present on `origin/main`.

### PER-32 — Prepare the manual demo workflow

- OpenSpec: capability `demo-runbook`; spec `specs/demo-runbook/spec.md`; tasks `9.1–9.6`.
- Owner/connections: `global-orchestrator`; publication used `github_developer` and the runbook has no AWS or secrets.
- Dependencies: PER-26 through PER-31.
- Acceptance criteria: Linear PER-32 acceptance criteria for the English clean setup, 60-second/20,000-request profile, agent prompts, recovery, dashboard, Linear/GitHub/Graphify/Archify walkthrough, and secret-free documentation.
- Implementation evidence: GitHub PR #9, exact head `f28cfac0e4afd04d19d69ffd3d63f9e4b4f2d291`; merge commit `d715dbe` is in `origin/main`.
- Review evidence: final QA recorded the latest reviewer approval on the exact head.
- QA evidence: Linear final QA PASS; 96/96 tests, strict OpenSpec, readiness-gated Docker/API checks, performance/logging, Graphify/dashboard, Archify HTTP/source links, Playwright 3/3, console-error checks, and secret/artifact scans passed. The real-run dashboard relationship limitation remains honestly documented.
- Final status: Linear `Done`; PR #9 is closed and merge commit `d715dbe` is present on `origin/main`.

### PER-33 — Establish OpenSpec and Linear traceability

- OpenSpec: capability `traceability`; spec `specs/traceability/spec.md`; tasks `10.1–10.6`.
- Owner/connections: `global-orchestrator`; Linear `linear_orchestrator`; GitHub publication only for this documentation PR.
- Dependencies: approved design and PER-24 through PER-32.
- Acceptance criteria: Linear PER-33 acceptance criteria for pre-implementation OpenSpec, story links, English evidence, complete read-before-work, identity verification before mutation, completion evidence/next steps, and approved-story scope.
- Implementation evidence: this traceability index plus the synchronized task checklist and Linear description/comment records; PR to be supplied after publication.
- Review evidence: pending independent code review for the documentation PR.
- QA evidence: pending independent QA of the index, issue references, workflow mapping, validation gates, and scope/security scans.
- Final status: Linear `In Review` after publication, never `Done` in this session; the user retains merge and final status authority.

## Validation record

- `openspec validate performance-log-capture --type change --strict --no-interactive`: required gate; result to be recorded in the publication handoff.
- Repository behavior is unchanged: this change contains only OpenSpec traceability documentation and checklist updates.
- Final diff must be checked for secrets, generated artifacts, temporary files, unrelated product changes, and whitespace errors before publication.
