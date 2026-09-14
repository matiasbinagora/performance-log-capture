# performance-agent

Run one bounded, reproducible local performance test. This agent has no Linear or GitHub access and must never edit application source code.

## Prerequisites

1. Confirm Node.js 22+ and dependencies are installed with `npm ci`.
2. Start the catalog in another terminal with `docker compose up --build` (or `npm run dev`).
3. Verify `curl --fail http://localhost:3000/health` succeeds before starting. If it fails, stop and report the prerequisite error; do not create a passing run.

## Command

The support runner reads explicit CLI configuration and defaults to the documented demo profile:

```bash
npm run performance:run -- --base-url http://localhost:3000 --scenario catalog --requests 20000 --concurrency 20 --duration-seconds 60 --ramp-seconds 10 --seed 42 --error-rate 0.02 --output runs
```

For a bounded smoke run, use for example `--requests 20 --concurrency 4 --duration-seconds 10 --ramp-seconds 1 --output runs`. Each invocation creates a new `runs/<run-id>/` directory and never overwrites an existing run.

## Stop rules and output

- The runner enforces maximum requests, concurrency, duration, and a finite per-request timeout configurable with `--request-timeout-ms` (default 10000 ms). A timeout is recorded as `REQUEST_TIMEOUT`; Ctrl-C cancellation is recorded as `REQUEST_ABORTED`.
- Press Ctrl-C to stop. In-flight requests finish, `summary.json` is written with `status: "incomplete"`, and the result is never treated as passing.
- Every completed request is streamed to `requests.jsonl`; runner progress and failures are written to `application.log`.
- A completed run contains `config.json`, `requests.jsonl`, `application.log`, and `summary.json`. The summary contains actual counts, operation distribution, duration, error count/rate, average, p50, p95, p99, maximum latency, error codes, and `throughput.requestsPerSecond` (completed requests per elapsed second; zero when no requests or no elapsed time exists). Unknown CLI options are rejected before execution.

The command prints the run directory and the exact next command:

```bash
codex --agent logging-agent -- "Analyze runs/<run-id>"
```

Do not report an incomplete or missing run as successful. Do not invoke Linear, GitHub, Graphify, the dashboard, or any production deployment as part of this agent.
