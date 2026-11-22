# Feature QA Checklist (non-UX) — said-nextjs starter

> **Starter-wiring stub.** The non-UX QA contract for the said-nextjs starter:
> project-wide quality gates expressed as `R-GATE-*` rules. Companion to a future
> `feature-ux-checklist.md` (visual / interaction / screen-shape rules). Consumed by
> `/said:review-qa` (Inspect's hygiene gate) and by `make pre-commit` (husky + CI).
>
> **This file is the only place gate `verify:` actions live.** `CLAUDE.md` names the
> `R-GATE-*` IDs and links here; it never inlines the command.

## How rules are organized

Each rule carries five fields:

- **id** — stable handle the QA report / commits / `Refs:` lines cite (`R-GATE-LINT`, …).
- **source** — canonical source (ADR file or runtime convention).
- **applies-to** — which task shapes the rule fires for. `any` fires on every task.
- **summary** — one-line statement.
- **verify** — concrete action.

## Command resolution

Gate `verify:` actions invoke **`make <target>`**. The resolution chain is
**`CLAUDE.md` → `Makefile` → `package.json` → operator**: `make` is the stable verb,
the `Makefile` maps it to a `package.json` script (the ground-truth tier), and each
`Makefile` gate target carries a comment naming the `R-GATE-*` rule it answers to.
Keep the `Makefile` comments and the rules below in sync.

## Bundle (`applies-to: any` — run at every task close)

```bash
make pre-commit    # R-GATE-LINT → R-GATE-TYPECHECK → R-GATE-BUILD, fails closed
```

---

## R-GATE-LINT — Lint clean

- **source:** runtime convention (`Makefile` `lint` → `package.json` `lint`)
- **applies-to:** `any`
- **summary:** ESLint reports no errors.
- **verify:**
  ```bash
  make lint
  ```
  Exit 0.

## R-GATE-TYPECHECK — Types clean

- **source:** runtime convention (`Makefile` `typecheck` → `tsc --noEmit`)
- **applies-to:** `any`
- **summary:** TypeScript compiles with no errors (strict mode).
- **verify:**
  ```bash
  make typecheck
  ```
  Exit 0.

## R-GATE-BUILD — Production build succeeds

- **source:** runtime convention (`Makefile` `build` → `package.json` `build` → `next build`)
- **applies-to:** `any`
- **summary:** `next build` completes (standalone output, no type errors).
- **verify:**
  ```bash
  make build
  ```
  Build succeeds. (Subsumes R-GATE-TYPECHECK, but the standalone typecheck gate stays
  for the fast inner-loop signal.)

---

## Enforcement ("always")

Awareness is in `CLAUDE.md` (the `R-GATE-*` names). Enforcement is mechanical — a
passive pointer is skippable by an agent under long context, so the starter ships:

- **`.husky/pre-commit`** → runs `make pre-commit` on every commit, fails closed.
  Auto-installed by husky on install (the `prepare` script). Hook body:
  ```sh
  #!/bin/sh
  make pre-commit
  ```
- **CI** → one step running `make pre-commit` on every PR.
- **`/said:review-qa`** → reads this file at task close and runs each rule's `verify:`.

## Optional gates (add as the starter grows)

- **R-GATE-TEST** → `make test` — when a test runner is added.
- **R-GATE-KNIP** → `make knip` — dead-code / unused-export detection.

Each new gate: add the `R-GATE-*` rule here, add a `Makefile` target with the rule
comment, add it to the `pre-commit` chain, and add its ID to `CLAUDE.md` Quality Gates.
