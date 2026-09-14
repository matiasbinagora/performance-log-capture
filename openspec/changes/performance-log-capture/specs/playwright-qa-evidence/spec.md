## ADDED Requirements

### Requirement: Playwright validation and embedded video evidence
QA SHALL validate the catalog and dashboard with Playwright, record a video, and attach that video for playback in the matching GitHub and Linear work items.

#### Scenario: Catalog validation
- **WHEN** QA runs against Docker
- **THEN** Playwright covers load, search success, product detail, and simulated search error

#### Scenario: Dashboard validation
- **WHEN** a report fixture is opened
- **THEN** Playwright verifies headline metrics, charts, incomplete messaging, and offline loading

#### Scenario: Video evidence
- **WHEN** the QA suite completes
- **THEN** a video is recorded and attached to both GitHub and Linear with an English evidence comment

#### Scenario: Failed validation
- **WHEN** any acceptance test fails
- **THEN** QA reports failure and does not move the work to final release readiness
