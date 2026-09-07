# Changelog — said-next

The releases of this Next.js SAID starter, newest first. A cloned project records
which release it is based on in its `## Lane` block (`SAID.version:`, the line under `SAID.lane:`);
this file says what each release is.

## said-next@1.0.2 — 2026-09-06

- The `## Lane` block carries key lines only. Anything a lane wants to explain about a key goes in its docs, not under the key: a consumer greps the block for a value and must find exactly one line per key.

## said-next@1.0.1 — 2026-09-06

- The version marker key is `SAID.version:` (was `template-version`) and sits directly under `SAID.lane:`. Value shape and meaning unchanged; an absent or old key still reads as unversioned.

## said-next@1.0.0 — 2026-09-04

Surface-contract shape complete:
- Lane meta-parameters on the `## Lane` block (declare · bind · consume · compose).
- The consume-contract registry (`docs/ux/feature-ux-rules.md`) with a proof-of-load sentinel.
- The surface-Checker model — `SAID.surface: web` + `SAID.reviewers: [web-ux, completeness]`.
- Per-feature `Surface:` field + the completeness Checker (the uxtoc basis→contract lifecycle).
