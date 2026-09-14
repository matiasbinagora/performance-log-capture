## ADDED Requirements

### Requirement: Evidence-first offline dashboard
The system SHALL generate an English standalone HTML dashboard that opens from the filesystem and presents measured evidence before conclusions.

#### Scenario: Offline opening
- **WHEN** a user opens the generated HTML file without a server or network
- **THEN** the page renders all charts, tables, metrics, and text

#### Scenario: Summary metrics
- **WHEN** a complete run is analyzed
- **THEN** the report shows request count, error percentage, typical latency, and maximum latency

#### Scenario: Operation comparison
- **WHEN** the report is rendered
- **THEN** it compares detail and search using latency, volume, and errors

#### Scenario: Incomplete data
- **WHEN** analysis input is incomplete
- **THEN** the report visibly marks the result incomplete and omits unsupported conclusions
