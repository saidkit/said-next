# <FEAT>-<NN>: [Feature Name]

## Context to load alongside this spec
- `docs/ux/<spec>.md` — <why it applies>
- `docs/adr/<ADR-NEXT-XXX>.md` — <why it applies>
- `src/features/<related>/` — <related code>
- `docs/features/<FEAT>-<NN>.tasks.md` — implementation log

(Load these before authoring or modifying code in this feature.)

## What & Why
**User Story:** As a [user], I want [goal] so that [benefit]
**Business Value:** [Why this matters]

## Requirements

### Functional Requirements
- [ ] [Core functionality requirement 1]
- [ ] [Core functionality requirement 2]
- [ ] [Core functionality requirement 3]

### UI/UX Requirements
- [ ] Screen: [ScreenName] — [what it displays, how user reaches it]
- [ ] Components: [ComponentName] — [what it renders, key interactions]
- [ ] State: [server via TanStack Query / client via Zustand / form via RHF]
- [ ] [User interaction flow]

### API Integration
- [ ] Endpoints consumed: [METHOD /path — purpose]
- [ ] Response types: [shape]
- [ ] Error handling: [toast? inline? retry?]

### Performance
- [ ] [Render performance / bundle impact / data volume considerations]

## Acceptance Criteria
```gherkin
Given [initial state]
When [user action]
Then [expected outcome]

And [additional condition]
Then [additional outcome]
```

## Definition of Done

See quality gates in `CLAUDE.md`.

## Feature Tasks

<!-- Optional: for features that discover subtasks during implementation.
     Keep the summary table here; put detailed analysis in a companion file.
     Create: <FEAT>-<NN>.tasks.md (same directory, same prefix).

| Task | Title | Status |
|---|---|---|
| <FEAT><NN>-NEXT-01 | [Short title] | Fixed / Open / Defer |

Detailed task log: [<FEAT>-<NN>.tasks.md](<FEAT>-<NN>.tasks.md)
-->

## Related
- **ADRs:** [Link to relevant architectural decisions]
- **Features:** [Link to dependent/related features]
- **Issues:** [Link to GitHub issues/tickets]
