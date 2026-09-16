## ADDED Requirements

### Requirement: Manual log analysis Codex agent
The local `logging-agent` SHALL validate and summarize a completed run, use Graphify for code evidence, and generate the standalone report without modifying product code.

#### Scenario: Complete input
- **WHEN** the agent receives a valid completed run directory
- **THEN** it calculates operation metrics, selects examples, queries Graphify, and prints the report path

#### Scenario: Incomplete input
- **WHEN** a required run file is missing or malformed
- **THEN** it reports an incomplete result and does not invent metrics or root cause

#### Scenario: Context boundedness
- **WHEN** the agent analyzes a large JSONL file
- **THEN** scripts process the full file and the model receives summaries and selected examples rather than the entire log


#### Scenario: Artifact validation
+- **WHEN** `config.json` is missing required fields, has malformed JSON, invalid types, unsupported values, or disagrees on `runId` with `summary.json`, `requests.jsonl`, or JSON `application.log` records
+- **THEN** the analyzer returns the documented non-zero incomplete-input exit code, reports source-attributed actionable validation issues, emits no derived findings, and never emits `status: "complete"`; requested `requests`, `concurrency`, and `durationSeconds` SHALL each be less than or equal to `maxRequests`, `maxConcurrency`, and `maxDurationSeconds`, respectively
