## ADDED Requirements

### Requirement: OpenSpec and tracker traceability
Every implementation story SHALL reference its OpenSpec capability, owner, dependencies, acceptance criteria, and validation evidence.

#### Scenario: Story reference
- **WHEN** an implementation story is created in Linear
- **THEN** its description links to the relevant OpenSpec change and capability

#### Scenario: Workflow transition
- **WHEN** an agent requests a Linear state transition
- **THEN** the preceding role's evidence is present and the mapped actor identity is verified

#### Scenario: Final review
- **WHEN** QA passes an implementation story
- **THEN** the user retains responsibility for moving it to `Done` and merging the GitHub PR
