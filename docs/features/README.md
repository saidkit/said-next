# Feature specs

Feature specs and append-only task logs live here.

## File pattern

- `<FEAT>-<NN>.md` — feature spec (per `template.md`)
- `<FEAT>-<NN>.tasks.md` — append-only task log (per `template-tasks.md`)
- Sub-phased variant: `<FEAT>-<NN>-<slug>.md` (e.g., `INIT-02-divisions.md`)

## Discover features

`ls docs/features/*.md` — file list is the registry. No central index (no drift).

## Authoring

- **New feature**: `/said:architect <scope-path>` — Phase 2 (Architect) generates spec + initial tasks log from a scope.md
- **New task on existing feature**: `/said:add-task <feature-id> [bug] [app=<APP>] [priority=High|Medium|Low]`
- **Implement**: `/said:impl <task-id>` — drives Phase A (Classify + Inventory) → Phase B (Implement) → Phase C (Verify + close)

## Related

- `template.md` — feature-spec stencil
- `template-tasks.md` — task-log stencil + authoring discipline + working-folder-vs-task-body notion
- `docs/screens/` — durable per-screen specs (cited from task body Refs / Reading list)
- `docs/adr/README.md` — ADR registry (decisions + relationships)
- `docs/ux/` — UX shape specs (lists / shell / form / errors)
