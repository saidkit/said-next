# UX shape specs

Durable, per-screen UX contracts — the *shape* a screen must have (header band,
panes, fields, columns, filters, actions, and empty/loading/error states),
independent of visual styling. Cited from feature specs and task `Reading list` / `Refs`.

## Why separate from feature specs

A feature spec says *what* a feature does; a UX shape spec says *how a screen is laid
out* — reused across features and evaluated mechanically. Keeping them apart lets
`/said:review-ux` check a screen against a stable contract and `/said:uxtoc` outline a
spec for fast iteration.

## Files (author per your product)

One file per screen archetype. A common set:

- `shell.md` — app shell, page-header band, navigation (`<PageHeader>` conventions)
- `lists.md` — list/table screens (columns, sorts, filters, row actions, empty state)
- `form.md` — detail/edit forms (panes, field grouping, validation surface)
- `errors.md` — error / empty / loading states (pairs with ADR-NEXT-S09)
- `fields.md` — field-type rendering conventions

The template ships this README + the mechanical checklist
([`../qa/feature-ux-checklist.md`](../qa/feature-ux-checklist.md)); author concrete
screen specs as your product takes shape — they are inherently project-specific.

## Rules

- A UX spec is descriptive *shape*, not visual styling (styling = ADR-NEXT-S02, the project's choice).
- Every interactive screen has explicit **empty / loading / error** states (loading → ADR-NEXT-S07; error → ADR-NEXT-S09).
- Frozen decisions get a number so tasks can cite them (e.g. `shell.md frozen #8`).
