# PER-31 Archify visual documentation

This directory contains two English, standalone diagrams for the local
performance-log-capture demo:

- [Component architecture](architecture.html) — application, deterministic
  scenarios, run artifacts, analysis, Graphify, dashboard, Playwright, and the
  GitHub/Linear evidence handoff.
- [Manual demo sequence](manual-demo-sequence.html) — the explicit human-led
  sequence from `performance-agent` activation to final human release review.

Each HTML file embeds its CSS and SVG. Open either file directly from the
filesystem; it does not start the catalog, contact Graphify, call GitHub or
Linear, load a CDN, or require credentials. The JSON files are the deterministic
diagram sources. `scripts/archify-diagrams.mjs` renders them and checks the
local contracts described below.

## Prerequisites and setup

- Node.js 22 or newer and npm.
- A clean checkout with the repository paths referenced by the diagrams.
- A browser capable of opening local HTML. Chrome, Safari, or Firefox is enough.

Install the project dependencies from the repository root:

```bash
npm ci
```

The diagrams themselves use only Node.js built-ins. Docker, Graphify, Linear,
GitHub credentials, and the application runtime are not prerequisites for
building or opening the diagrams.

## Exact commands

Run these commands from the repository root:

```bash
npm run archify:build
npm run archify:validate
npm run archify:verify
```

Expected output is two files under `docs/archify/`:

```text
docs/archify/architecture.html
docs/archify/manual-demo-sequence.html
```

`archify:validate` checks one inline SVG per document, finite layout values,
repository-relative references, offline/no-secret boundaries, and all required
component or participant IDs. `archify:verify` runs validation, regenerates both
files in a temporary directory, and compares the bytes and SHA-256 values with
the committed outputs.

## Open each diagram locally

On macOS:

```bash
open docs/archify/architecture.html
open docs/archify/manual-demo-sequence.html
```

Or use a local-only static server if the browser blocks local file navigation:

```bash
python3 -m http.server 4174 --directory docs/archify
open http://127.0.0.1:4174/architecture.html
open http://127.0.0.1:4174/manual-demo-sequence.html
```

The `http.server` command is only a local viewing aid; the committed diagrams
remain self-contained. Use the **Toggle theme** control and the cross-links to
inspect both diagrams before a demo recording. The browser should show the
complete SVG, readable node labels, source-reference cards, and the direct vs
inference legend without horizontal clipping at normal desktop width.

## Regenerate deterministically

Edit only the relevant JSON source when changing diagram content:

```bash
$EDITOR docs/archify/architecture.json
npm run archify:build
npm run archify:validate
npm run archify:verify
```

The renderer uses stable input ordering and no timestamps, machine paths, random
IDs, or network assets. A change is ready only when `archify:verify` passes and
both HTML files have been opened locally.

## Evidence classification

The legend and source cards classify evidence as follows:

- **Direct evidence**: implemented code, tests, generated run-artifact
  conventions, documentation, or workflow configuration that exists in this
  repository. Examples include `src/performance/runner.ts`,
  `tests/e2e/dashboard.spec.ts`, and `.github/workflows/per-30-playwright-evidence.yml`.
- **Explanatory inference**: the narrated relationship between independent
  manual steps, such as a human invoking `logging-agent` after the performance
  run or a reviewer deciding whether to release after evidence publication.
  Dashed amber lines make these relationships visible without implying an
  automatic runtime handoff.

Generated run directories such as `runs/<run-id>/` are intentionally shown as
conventions, not committed fixtures. Videos, screenshots, Graphify output,
`.env` files, tokens, and machine-specific paths do not belong in Git history.

## Source references

The diagrams link to repository-relative paths across `src/`, `scripts/`,
`tests/`, `docs/`, `openspec/`, `.github/workflows/`, and `.codex/agents/`.
The relevant contracts are:

- `openspec/changes/performance-log-capture/specs/archify-documentation/spec.md`
- `openspec/changes/performance-log-capture/design.md`
- `openspec/changes/performance-log-capture/tasks.md`
- `docs/graphify-demo.md`
- `docs/playwright-qa-evidence.md`

## Troubleshooting

- **A reference check fails:** run `npm run archify:validate` and open the
  reported path from the repository root. A generated `runs/<run-id>/...`
  convention is allowed without a checked-in run.
- **The HTML is stale:** run `npm run archify:build` and then
  `npm run archify:verify`. Do not hand-edit generated HTML.
- **The browser shows only part of a diagram:** use a desktop viewport or the
  local server command above. The stage is intentionally horizontally scrollable
  for narrow screens while retaining a readable desktop layout.
- **The optional upstream Archify CLI is unavailable:** this checkout does not
  vendor a global skill installation. The committed renderer is the no-network
  fallback used here; it produces the same intended local artifact shape—source
  JSON plus standalone inline-SVG HTML—and its validation is enforced by the
  repository scripts above. If the official Archify skill is installed later,
  keep these JSON sources and compare its output visually before replacing the
  committed HTML.
