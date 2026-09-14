## ADDED Requirements

### Requirement: Local catalog API and UI
The application SHALL provide a deterministic catalog API and a minimal browser UI without external services.

#### Scenario: Health check
- **WHEN** a client requests `GET /health`
- **THEN** the application returns HTTP 200 with a JSON success response

#### Scenario: Product detail
- **WHEN** a client requests a known product ID
- **THEN** the API and browser UI show that product's deterministic name and price

#### Scenario: Unknown product
- **WHEN** a client requests an unknown product ID
- **THEN** the API returns HTTP 404 with a structured error response and the UI shows a visible error

#### Scenario: Product search
- **WHEN** a client searches for the same query twice
- **THEN** the result ordering and product data are identical
