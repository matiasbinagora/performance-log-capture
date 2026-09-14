## Why

The project needs a small, repeatable application that makes performance
symptoms and log analysis easy to demonstrate to a non-technical audience.
This change establishes the local demo foundation before implementation begins.

## What Changes

- Add a Dockerized product catalog with a minimal browser UI and HTTP API.
- Add deterministic slow-search and error scenarios.
- Add two manual local Codex agents: a performance test agent and a log analysis
  agent.
- Store isolated run artifacts containing logs, metrics, configuration, and
  summaries.
- Generate an evidence-first, standalone HTML dashboard in English.
- Use Graphify to connect measured symptoms with source code.
- Add Playwright QA with video evidence embedded in GitHub and Linear.
- Add Archify diagrams and an English manual demo runbook.
- Define OpenSpec, Linear, GitHub, and agent handoff traceability.

## Capabilities

### New Capabilities

- `catalog-app`: Deterministic local product catalog API and browser UI.
- `performance-runs`: Configurable load scenarios and isolated run artifacts.
- `performance-agent`: Manual Codex agent that executes reproducible load tests.
- `log-analysis-agent`: Manual Codex agent that processes runs and explains findings.
- `standalone-dashboard`: Offline HTML report with metrics, charts, tables, and evidence.
- `graphify-evidence`: Reproducible Graphify graph generation and code queries.
- `playwright-qa-evidence`: Runtime QA, tests, and embedded video evidence.
- `archify-documentation`: Visual architecture and demo-flow documentation.
- `demo-runbook`: English instructions for the complete manual demonstration.

### Modified Capabilities

None. The repository contains no existing product capabilities.

## Impact

This is a new local Dockerized application and agent workflow. It introduces
Node.js/TypeScript runtime dependencies, structured JSONL logs, run artifact
schemas, HTML report generation, Graphify integration, Playwright tests, and
documentation. Linear and GitHub are used for development workflow only; the
two demo agents do not access either tracker. AWS is out of scope for this
change.
