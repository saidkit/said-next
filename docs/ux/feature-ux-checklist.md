# Feature UX checklist

Mechanical per-screen UX gate. `/said:review-ux` runs each applicable rule against a
changed screen and returns PASS / FAIL / SOFT-FLAG with `file:line` (or Playwright)
evidence. Rules are tagged by screen shape so only the relevant ones apply.

## applies-to: any

- [ ] **Loading state** — every data-fetching segment has a `loading.tsx` or a scoped `<Suspense>` (ADR-NEXT-S07).
- [ ] **Error state** — an `error.tsx` at/above the segment, or expected failures returned / `notFound()`ed inline (ADR-NEXT-S09).
- [ ] **Empty state** — lists/collections render a deliberate empty state, not a blank area.
- [ ] **No layout shift** — media reserve space; fonts via `next/font` (no FOUT).
- [ ] **Semantic landmarks** — one `<main>`, headings in order, interactive elements are real `<button>` / `<a>`.
- [ ] **Metadata** — content-backed routes export `generateMetadata` reading `post.seo` (ADR-NEXT-S07).

## applies-to: list

- [ ] Columns, sort, and filters match the screen's UX shape spec.
- [ ] Row actions are keyboard-reachable; the primary action is obvious.
- [ ] Pagination / infinite-scroll matches the list spec; URL-driven where shareable (`searchParams`).

## applies-to: form

- [ ] Validation surfaces at the field — Server Action + Zod via `useActionState`; expected errors are **returned, not thrown** (ADR-NEXT-S09).
- [ ] Pending state disables submit (`useFormStatus`).
- [ ] Success / failure feedback is explicit.

## verify:

Each rule's evidence is a `file:line` or a Playwright assertion. SOFT-FLAG = reviewer
judgment; FAIL = contract violation.
