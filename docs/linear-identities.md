# Linear identities

Secrets live in the ignored root `.env`: LINEAR_API_KEY_ORCHESTRATOR,
LINEAR_API_KEY_DEVELOPER and LINEAR_API_KEY_QA.

Build with `docker build -t performance-log-linear:local .docker/linear-bridge`.
Restart the Codex session in this trusted project to load its `.codex/config.toml`.
The three `linear_*` connections start containers with only their selected PAT.
The container validates the email before exposing the official Linear tools.
Role-to-connection selection and task workflow are defined in root AGENTS.md.

After rotating a key, restart the MCP connections. Never copy `.env` into a
container image or commit it. Docker environment inspection by a local Docker
administrator can access running container credentials.

GitHub keeps its existing authentication. This integration does not depend on
the agents-cli source checkout, or on shared Docker Toolkit OAuth credentials.

Verification: `node scripts/verify-linear.mjs` initializes each Docker MCP,
lists tools and checks `get_user(query: "me")` against the expected email.
On 2026-09-13 all three identities passed, with 65 tools per connection.
This check does not create comments or mutate tasks.
