## Context

The repository currently contains the agent configuration and workflow
documentation but no product code. The change introduces one local Dockerized
catalog, two manually invoked local Codex agents, reproducible run artifacts,
an offline report, Graphify evidence, Playwright validation, and Archify
documentation.

## Goals / Non-Goals

**Goals:**

- Keep the demo local, deterministic, inexpensive, and easy to explain.
- Separate application behavior, load generation, analysis, and presentation.
- Preserve raw evidence while giving the logging agent compact summaries.
- Make every important result verifiable by scripts or browser tests.
- Keep all demo content and documentation in English.

**Non-Goals:**

- AWS Lambda, CloudWatch, authentication, database persistence, multi-user
  access, production observability, automatic agent handoff, or fixing the
  simulated performance problem.

## Decisions

### Runtime and application boundary

Use Node.js with TypeScript and a lightweight HTTP framework. The catalog owns
the deterministic dataset and request behavior. A minimal static browser UI
calls the same API. Python and Next.js were considered, but would add a second
runtime or a full application server without helping the first demo.

### Reproducible workload

Keep delay, error rate, duration, target request count, and random seed in a
run configuration. The load runner writes a new run directory and never
overwrites an earlier run. JSONL is used for append-friendly request events;
JSON is used for configuration and summary data.

### Agent boundary

The performance and logging agents are local Codex roles invoked manually by
the user. They can read and write run artifacts but do not use Linear or
GitHub. The performance agent creates evidence; the logging agent consumes it
and creates the dashboard. Neither changes product code during the demo.

### Report generation

Generate a self-contained HTML file with inline or bundled assets. Use an
evidence-first hierarchy: headline metrics, charts, operation table, examples,
then plain-English diagnosis and Graphify references. A missing or incomplete
input produces an explicit incomplete report.

### QA and evidence

Use Playwright for UI and dashboard validation. Record video per QA run and
attach it to the corresponding GitHub PR/issue and Linear task. Videos remain
outside Git history. QA reports use the `github_qa` and `linear_qa` identities.

### Delivery workflow

Use the existing Linear issue states: `Backlog`, `Todo`, `In Progress`, `In
Review`, and `Done`. The orchestrator recommends moving a story from Backlog to
Todo. The user approves that move; the developer then starts implementation
and moves it to In Progress. After implementation it moves to In Review. The
code reviewer comments on GitHub and approves or requests changes. Approved
work moves to QA verification conceptually, represented by the available
`Todo`/`In Review` workflow until the team adds a dedicated state. QA adds tests,
validates, and reports evidence. The user performs final review, moves the
issue to Done, and merges manually.

## Risks / Trade-offs

- [Large logs consume disk] → Use bounded demo runs, JSONL streaming, and
  retain a summary plus selected examples.
- [Timing varies by machine] → Compare relative operation behavior and record
  host/configuration metadata; do not promise fixed absolute latency.
- [Graphify is unavailable] → Preserve measured analysis and explicitly label
  code evidence unavailable.
- [Embedded video upload differs by platform] → Make upload and playback an
  acceptance criterion and report a blocking failure if either platform cannot
  render the attachment.
- [Manual handoff can be skipped] → Agent instructions print the next command,
  and the runbook keeps the sequence explicit.

## Migration Plan

No production migration is required. Start with Docker Compose locally, run the
fixture and browser checks, then execute the default demo profile. Rollback is
removing the local change or selecting an earlier run artifact; no external
service state is changed by the application.

## Open Questions

None for the first implementation slice. AWS deployment can be designed as a
separate future change after the local demo is accepted.
