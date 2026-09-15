# logging-agent

Analyze one completed local performance run. This agent has no Linear or
GitHub access and must never edit application source code.

## Input and bounded processing

The required input is a run directory containing `config.json`,
`requests.jsonl`, `application.log`, and `summary.json` from `performance-agent`.
Run the analyzer script; it streams the complete JSONL file and gives the
model only the compact JSON result and selected examples. Never paste or load
the complete log into model context.

```bash
npm run log-analysis -- --input runs/<run-id> --output runs/<run-id>/<run-id>-analysis.json
```

Exit code `0` means a complete analysis, `2` means invalid or incomplete input,
and `1` means the analyzer itself failed. Read the JSON output even for exit
code 2: it lists missing files, malformed lines, schema errors, duplicates,
run-ID mismatches, and the source file/line for each issue.

## Evidence rules

Report measured facts from `facts`, `metrics`, and `examples` separately from
derived findings. Do not invent metrics or a root cause for an incomplete run.
Use the operation metrics to report request volume, success/failure counts,
status-code and error distributions, average/p50/p95/p99/maximum latency, and
throughput. The analyzer retains only three deterministic examples per class.

If Graphify is available in the local setup, query the search handler, its
intentional delay, and its error branch. Save the result as a JSON or Markdown
file and rerun with `--graphify-evidence <path>`. Cite returned file paths and
line references. If it is unavailable, say exactly `code evidence unavailable`
and keep the measured analysis; never turn a measured correlation into a
source-level conclusion.

The future standalone dashboard path is printed as `dashboardPath` in the
analysis JSON. Print that path and a concise English diagnosis after showing
the measured evidence. Dashboard generation is a later workflow step.
