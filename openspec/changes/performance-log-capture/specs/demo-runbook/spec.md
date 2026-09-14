## ADDED Requirements

### Requirement: Repeatable English demo runbook
The project SHALL document the exact local setup, manual agent prompts, expected artifacts, dashboard step, and recovery procedure in English.

#### Scenario: Clean setup
- **WHEN** a new user follows the runbook on the configured MacBook
- **THEN** the user can start Docker, run the catalog, and reach the browser UI

#### Scenario: Agent handoff
- **WHEN** the performance agent completes
- **THEN** the runbook provides the exact logging-agent command and expected run directory

#### Scenario: Recovery
- **WHEN** a run is interrupted
- **THEN** the runbook explains how to identify the incomplete run and start a new one safely
