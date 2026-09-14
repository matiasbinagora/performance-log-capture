## ADDED Requirements

### Requirement: Reproducible Graphify code evidence
The workflow SHALL generate and query a Graphify knowledge graph for the repository and preserve a reference to the query result.

#### Scenario: Search path query
- **WHEN** Graphify is available and the repository is mapped
- **THEN** a query reaches the search handler and intentional delay/error logic with source references where available

#### Scenario: Unavailable Graphify
- **WHEN** Graphify cannot run
- **THEN** the report states `code evidence unavailable` and retains measured log analysis
