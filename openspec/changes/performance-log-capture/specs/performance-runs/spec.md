## ADDED Requirements

### Requirement: Deterministic performance run
The system SHALL execute configurable load scenarios and persist raw request evidence and a summary in an isolated run directory.

#### Scenario: Default profile
- **WHEN** the default profile is executed
- **THEN** the runner targets 20,000 requests over 60 seconds and records its actual outcome

#### Scenario: Slow search
- **WHEN** a search request is processed
- **THEN** only search receives the configured intentional delay

#### Scenario: Reproducible errors
- **WHEN** identical error rate and random seed are used
- **THEN** the same request outcomes are produced

#### Scenario: Request event
- **WHEN** any request completes
- **THEN** JSONL evidence contains run ID, request ID, operation, status, duration, timestamp, and error code when applicable

#### Scenario: Incomplete run
- **WHEN** a run is interrupted or required evidence is missing
- **THEN** its status is `incomplete` and consumers cannot treat it as a passing run
