## ADDED Requirements

### Requirement: Manual performance Codex agent
The local `performance-agent` SHALL execute one reproducible load run and shall not modify product code or access Linear or GitHub during the demo.

#### Scenario: Start a run
- **WHEN** the user invokes the agent with the application available
- **THEN** it checks prerequisites, starts the configured workload, and creates a new run ID

#### Scenario: Complete a run
- **WHEN** the workload completes
- **THEN** the agent verifies required artifacts and prints their directory and the next logging-agent command

#### Scenario: Missing application
- **WHEN** the application is unavailable
- **THEN** the agent stops with a clear prerequisite error and creates no passing result
