# Changelog — said-next

The releases of this Next.js SAID starter, newest first. A cloned project records
which release it is based on in its `## Lane` block (`SAID.version:`, the line under `SAID.lane:`);
this file says what each release is.

## said-next@1.2.0 - 2026-11-22

- The `## Lane` block is stamped `said@0.28.0`.
- The SAID phases are named Scope, Act, Inspect, Debrief in the workflow section; the numbered phases are gone. `review-qa` is Inspect's hygiene gate in the QA checklist.

## said-next@1.1.0 - 2026-11-04

- The `## Lane` block is stamped `said@0.26.0`: the lane passes the said upgrade checks up to that release.
- The task template carries the operator-question hold: the `**Blocked-on question:**` field and the `## Lifted holds` section, lifted only by a recorded ruling.
- The completeness recompute runs from `skills/board/`, the script's new home.

## said-next@1.0.3 - 2026-09-14

Completeness surface last-mile — a web adopter can now run the completeness gate:
- Ships `docs/ux/feature-ux-grammar.md` — the comma-schema `surface=web` grammar (unit=Screen; containers Columns;Sections;Row actions; token UXG-WEB-1). The completeness oracle injects this as `SAID_GRAMMAR`; without it the recompute halted "no grammar" for every web adopter rolled from this starter.
- Backports the `completeness` Checker recipe (`docs/ux/feature-ux-rules.md`) to the current single-source model: `said-capture: process-spawn` (+ `said-env: SAID_GRAMMAR;SAID_SURFACE`); DESIGNED is grammar-driven (element-projection RULE + injected grammar, attribute-set aware); the retired `toc-checksum:` self-cert is dropped for the no-seal model (the operator hand-edits `toc.md` freely).

## said-next@1.0.2 - 2026-09-06

- The `## Lane` block carries key lines only. Anything a lane wants to explain about a key goes in its docs, not under the key: a consumer greps the block for a value and must find exactly one line per key.

## said-next@1.0.1 - 2026-09-06

- The version marker key is `SAID.version:` (was `template-version`) and sits directly under `SAID.lane:`. Value shape and meaning unchanged; an absent or old key still reads as unversioned.

## said-next@1.0.0 - 2026-09-04

Surface-contract shape complete:
- Lane meta-parameters on the `## Lane` block (declare · bind · consume · compose).
- The consume-contract registry (`docs/ux/feature-ux-rules.md`) with a proof-of-load sentinel.
- The surface-Checker model — `SAID.surface: web` + `SAID.reviewers: [web-ux, completeness]`.
- Per-feature `Surface:` field + the completeness Checker (the uxtoc basis→contract lifecycle).
