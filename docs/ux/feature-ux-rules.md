# Surface-contract rules — `web` surface

<!-- SC-HEADER: feature-ux-rules · surface=web · token UXR-WEB-7C1 · 7 rules
     Proof-of-load sentinel (the SAID consume contract): a consumer LOADs this file WHOLE and echoes
     `UXR-WEB-7C1 · 7 rules` before reasoning over it. token + count are both required;
     count = the number of `R-WEB-*` entries in the registry below (obtainable only by reading).
     No token/count echoed → the consumer HALTs. Never grep/derive a single entry. -->

**Surface:** `web` — Next.js SSR screens (App Router). Verified by the `web-ux` Checker
(browser walk against `feature-ux-checklist.md`) + the `completeness` oracle.

This is the `web` lane's instantiation of the surface-contract **rule registry** (the SAID consume contract).
It is the read-target `add-task` / `architect` / `impl` consume to author task Acceptance — the
screen-shape taxonomy + routing those skills would otherwise hardcode. The engine skill carries no
rules of its own; it LOADs this registry (via `SC-STUB`, resolved from `SAID.docs-root:`) and cites
rule ids. Rows are derived from this starter's existing contract (`docs/ux/feature-ux-checklist.md`,
`docs/ux/README.md` archetypes, the `ADR-NEXT-*` set), not invented here.

## Registry

Per entry: `**id** — summary`, then `source→prose` and `applies-to`. No `order` field — ordering is
implementer judgment, checked at review time.

- **R-WEB-01** — A page composes, it doesn't implement: routes are thin entry points (page-header band, nav shell) that call features + shared components; RSC by default, `"use client"` only at the edges.
  - source→prose: ADR-NEXT-S01 (repository structure); `docs/ux/README.md` (shell archetype)
  - applies-to: shell / any
- **R-WEB-02** — List/table shape: columns, sorts, filters, row actions, pagination match the screen's UX shape spec; URL-driven (`searchParams`) where shareable; a deliberate empty state, never a blank area.
  - source→prose: `docs/ux/feature-ux-checklist.md` (applies-to: list); ADR-NEXT-S07
  - applies-to: list
- **R-WEB-03** — Form shape: validation surfaces at the field (Server Action + Zod via `useActionState`; expected errors **returned, not thrown**); pending state disables submit; explicit success/failure feedback.
  - source→prose: `docs/ux/feature-ux-checklist.md` (applies-to: form); ADR-NEXT-S09
  - applies-to: form
- **R-WEB-04** — Boundary states: every data-fetching segment has a `loading.tsx`/scoped `<Suspense>`; an `error.tsx` at/above the segment or expected failures `notFound()`ed inline (missing vs broken).
  - source→prose: `docs/ux/feature-ux-checklist.md` (applies-to: any); ADR-NEXT-S07, ADR-NEXT-S09
  - applies-to: any
- **R-WEB-05** — Semantics + no layout shift: one `<main>`, headings in order, interactive elements are real `<button>`/`<a>`; media reserve space, fonts via `next/font` (no FOUT).
  - source→prose: `docs/ux/feature-ux-checklist.md` (applies-to: any)
  - applies-to: any
- **R-WEB-06** — SEO rides the content contract: content-backed routes export `generateMetadata` reading `post.seo`; adapters fill it, no vendor SEO calls in routes.
  - source→prose: `docs/ux/feature-ux-checklist.md` (applies-to: any); ADR-NEXT-S07
  - applies-to: content routes
- **R-WEB-07** — Self-containment: this starter's shipped `docs/` scaffold stays generic — no consuming-product id, slug, or route baked into the template; a consuming app appends its specifics in the `CLAUDE.md` PROJECT-SPECIFIC section.
  - source→prose: `CLAUDE.md` (PROJECT-SPECIFIC section note)
  - applies-to: the starter's shipped docs

## Acceptance stencils

Paste-ready Acceptance bullets `add-task` / `architect` fold into a task (cite the id; never restate
the prose — the implementer opens this registry):

- `- [ ] R-WEB-01 — route composes (thin page → features/components); RSC-by-default (per feature-ux-rules.md).`
- `- [ ] R-WEB-02 — list shape: columns/sorts/filters/pagination + empty state per the screen's UX shape spec.`
- `- [ ] R-WEB-03 — form validation at the field (Server Action + Zod; errors returned); pending disables submit.`
- `- [ ] R-WEB-04 — loading + error/not-found boundaries present (missing vs broken).`
- `- [ ] R-WEB-05 — semantic landmarks; real button/a; no layout shift (next/font).`
- `- [ ] R-WEB-06 — content routes export generateMetadata reading post.seo.`
- `- [ ] R-WEB-07 — starter docs stay generic; no consuming-product id/slug leaks into the template.`

## The Checker verdict artifact (L1) — the SAID surface-Checker model

Every Checker run writes `docs/working/<id>/review-<checker-id>-<task>.md` with a machine-checkable
header the L2 oracle (`said_status.py --reviewer-gate`) validates — existence is necessary, never
sufficient:

```
checker-id: <id>                     # the Checker that ran (matches SAID.reviewers:)
target-sha: <the HEAD sha it ran against>
capture-evidence-ref: <path to the capture, relative to the working dir>
verdict: PASS | FAIL
timestamp: <ISO-8601>
```

The oracle checks `verdict == PASS`, `capture-evidence-ref` resolves to a present file, and
`target-sha == HEAD`; for a deterministic-family Checker it also recomputes. A fabricated `PASS` with
a dangling capture / a stale sha is caught. The `web-ux` Checker (agent-form, `said-judge:
comparative`, `said-capture: browser`) ships with the `said` plugin — this lane names it, authors nothing.

## The `completeness` Checker (the uxtoc basis→contract lifecycle) — recipe-form instance

The uxtoc basis→contract lifecycle's accept-time check, a **recipe-form** Checker (so the gate mechanism
does not fork):

```
said-checker:   completeness
said-governs:   surface=web               # fires on a feature that bears a surface (per the feature `Surface:`)
said-capture:   elements+built-evidence   # docs/working/<feature>/toc.md (the single source, parsed via the element-projection taxonomy) + built-surface evidence
said-judge:     oracle
said-recompute: python3 "$SAID_PLUGIN_ROOT/skills/status/said_completeness.py"   # designed ⊆ (built ∪ accounted-drops)
```

- **Applicability** — the feature-level bearing gate: bears-surface + outline present → CHECK; bears-surface + outline **missing** → FAIL; `Surface: none` → SKIP.
- **Judge = `oracle`** — the L2 oracle **recomputes** the set comparison from the outline + evidence rather than trusting the L1 `verdict`, so a fabricated `PASS` fails recompute.
- **DESIGNED (re-derived)** — parsed from the single source `docs/working/<feature>/toc.md` via the **element-projection taxonomy** (the plugin's fixed rule for turning a `uxtoc` outline into a set of screen-qualified `(screen, element-id)` pairs): a `## <Screen>`-grouping header opens a screen; an element is a valueless keyed line under a taxonomy container header. DESIGNED is a set of `(screen, key)` pairs, re-derived from `toc.md` every run — never from a persisted intermediate.
- **Charter** — the Checker READS `toc.md` + the built-surface evidence, never writes them. **No intermediate is persisted** — `uxtoc` self-certifies its own emission with a `toc-checksum:` line, and the check verifies that count against its own re-parse, FAILing "re-run uxtoc" on a mismatch (an accidental hand-edit signal).
