# Linear operating policy

This project uses Linear for task tracking. These rules are mandatory for any
agent that reads or changes Linear.

The authorized base Linear account/workspace is `matiasnj@gmail.com`. GitHub
authentication is separate and must use `matiasbinagora`.

## Actor mapping

| Agent | Required Linear actor |
| --- | --- |
| `global-orchestrator` | `matiasnj+orquestrator@gmail.com` |
| `global-backend-developer` | `matiasnj+developer@gmail.com` |
| `global-qa-manual` | `matiasnj+qa@gmail.com` |
| `global-qa-automator` | `matiasnj+qa@gmail.com` |

The corresponding local secret variables are:

| Agent | Environment variable |
| --- | --- |
| `global-orchestrator` | `LINEAR_API_KEY_ORCHESTRATOR` |
| `global-backend-developer` | `LINEAR_API_KEY_DEVELOPER` |
| `global-qa-manual` | `LINEAR_API_KEY_QA` |
| `global-qa-automator` | `LINEAR_API_KEY_QA` |

Agents not listed above must not perform Linear mutations unless the user
explicitly assigns an actor first.

## Required Linear workflow

1. Before any action, read the complete task: title, description, status,
   labels, relations, acceptance criteria and existing comments.
2. Verify that the active Linear MCP credential belongs to the mapped actor.
   If it cannot be verified, stop and report `IDENTITY NOT VERIFIED`; never
   claim to be impersonating the actor based only on this document.
3. Perform only the authorized action.
4. After every task work session (including read-only analysis and testing), add a comment to the same task describing what was
   done, the outcome, evidence or checks, and the next step.

## Mandatory MCP selection

Use only the MCP connection assigned to your role:

| Agent | MCP connection |
| --- | --- |
| `global-orchestrator` | `linear_orchestrator` |
| `global-backend-developer` | `linear_developer` |
| `global-qa-manual` | `linear_qa` |
| `global-qa-automator` | `linear_qa` |

Never use another role's connection or a shared Linear OAuth connection.
The parent coordinating session uses `linear_orchestrator`. Each handoff must
include the assigned connection, task ID and this read-before-work/comment-after-work contract.
If the assigned connection is unavailable, stop Linear work and report it.
The project is https://linear.app/matias-personal/project/performance-log-capture-f61b2a40b1ef/overview.

`.codex/config.toml` starts three independent Docker containers through
`scripts/linear-launch.mjs`. Each receives only its selected PAT from the ignored
local `.env`, verifies the expected email, then connects to the official Linear
MCP. Secrets are not embedded in configuration or images. Connection selection
is an agent instruction; shared-session tool availability is not an isolation
boundary between agents.

# GitHub operating policy

GitHub work uses the account `matiasbinagora` and the installed GitHub Apps:

| Agents | GitHub identity | MCP connection |
| --- | --- | --- |
| `global-backend-developer`, `global-frontend-developer` | `cli-developer-agent` | `github_developer` |
| `global-code-reviewer` | `matias-code-reviewer-agent` | `github_reviewer` |
| `global-qa-manual`, `global-qa-automator` | `cli-qa-agent` | `github_qa` |

Before GitHub work, read the complete issue or pull request, including its
description, comments, labels, status, relations and acceptance criteria.
After every task work session, add a comment or review note to the same issue
or pull request describing the work, outcome, evidence and next step.
If the assigned connection is unavailable, stop and report `IDENTITY NOT VERIFIED`.

## GitHub App identity verification

The GitHub MCP connections use short-lived GitHub App installation tokens, not
human user tokens. Therefore `github_reviewer.get_me`, `get_user`,
`get_authenticated_user`, and direct `GET /user` checks are not valid identity
checks and must not be used as a prerequisite; GitHub may return 401 or 403 for
those endpoints even when the App is correctly configured.

For GitHub identity verification, use the configured role-specific launcher and
the project-root `.env`, then verify the App installation through successful
access to the assigned repository, target branch/commit, pull request, and the
required review or comment operation. The expected reviewer App is
`matias-code-reviewer-agent`, installed for `matiasbinagora`. If those checks
succeed, the App identity is verified. Do not substitute `gh`, a PAT, or a
human GitHub account.
