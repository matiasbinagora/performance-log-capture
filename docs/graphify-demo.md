# Graphify project-context demo

This repository uses the official `graphify` CLI from the `graphifyy` package
as an optional local development tool. The application never imports or starts
Graphify.

## Setup and update

From a clean checkout, install Node dependencies and the isolated Graphify
tool:

```bash
npm ci
uv tool install graphifyy
graphify --version  # validation used graphify 0.9.48
```

Build the index whenever source or documentation changes:

```bash
npm run graphify:index
npm run graphify:inspect
```

`graphify extract . --code-only --no-cluster --out .` is the documented
credential-free AST mode. It creates the ignored `graphify-out/graph.json`.
The integration also creates the ignored `graphify-out/context-index.json`, a
stable text index for the project material Graphify's code-only mode skips.
This keeps documentation search local and deterministic.

The indexed allowlist covers TypeScript/JavaScript source, OpenSpec Markdown,
English documentation, JSON/JSONL/YAML/TOML/SQL schemas and fixtures, and
`AGENTS.md` instructions. It excludes `.env` files (including examples),
secret-like names, `.git`, `.worktrees`, `node_modules`, generated output,
Playwright video formats, unsupported binaries, and files over 1 MiB. The
Graphify safety rules are also recorded in `.graphifyignore`.

## Example searches

```bash
npm run graphify:search -- "search handler intentional delay error"
npm run graphify:search -- "summary schema dashboard inputs"
npm run graphify:search -- "OpenSpec acceptance criteria"
```

The output reports the query, graph path, deterministic context matches with
category/path/line, and Graphify's structural query result. Typical matches
include `src/api/catalog-routes.ts` for the search handler, the
`graphify-evidence` OpenSpec capability for acceptance criteria, and README or
schema files for dashboard/run contracts once those files exist.

The logging workflow can save the complete command output as evidence, for
example:

```bash
mkdir -p /tmp/performance-log-capture-evidence
npm run graphify:search -- "search handler intentional delay error" \
  | tee /tmp/performance-log-capture-evidence/graphify-search.txt
```

This evidence links the measured slow-search observation to source locations;
it does not itself prove a performance root cause.

## Failure behavior and limitations

If `graphify` is missing, `npm run graphify:index` exits non-zero and prints
`code evidence unavailable`. If the ignored index is missing, search and
inspect print the exact rebuild command and exit non-zero. Measured log
analysis can continue independently.

Graphify's documented semantic extraction for Markdown and other documents can
use an LLM backend. This integration deliberately does not require credentials
or network access at runtime, so document lookup uses the deterministic
companion index while the Graphify graph remains AST-based. No generated graph
files are committed.
