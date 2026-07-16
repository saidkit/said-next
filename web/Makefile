# said-nextjs starter — command facade.
#
# CLAUDE.md and docs/qa/feature-qa-checklist.md reference `make <target>` ONLY.
# This file is the single place that maps verbs -> package.json scripts (the
# ground-truth tier). Resolution chain: CLAUDE.md -> Makefile -> package.json.
#
# Each quality-gate target is tagged with the R-GATE-* rule it answers to; the
# rule's `verify:` action (defined in docs/qa/feature-qa-checklist.md) is exactly
# `make <that target>`. Keep these comments in sync with the checklist.

.DEFAULT_GOAL := help
.PHONY: help dev start lint install typecheck build pre-commit verify

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-13s\033[0m %s\n",$$1,$$2}'

# --- Operational (no gate) -------------------------------------------------
dev: ## Start the Next.js dev server
	pnpm run dev

start: ## Serve the production build
	pnpm run start

install: ## Run installation
	pnpm install

# --- Quality gates (verify: actions live in docs/qa/feature-qa-checklist.md) -
# R-GATE-LINT — ESLint reports no errors.            verify: `make lint` exits 0.
lint: ## R-GATE-LINT — lint clean
	pnpm run lint

# R-GATE-TYPECHECK — TypeScript compiles clean (strict).  verify: `make typecheck` exits 0.
#   NOTE: routed straight to tsc; add a "typecheck": "tsc --noEmit" package.json
#   script to pull this back through the chain (Makefile -> package.json).
typecheck: ## R-GATE-TYPECHECK — types clean
	pnpm exec tsc --noEmit

# R-GATE-BUILD — `next build` completes (standalone, no type errors).  verify: `make build` succeeds.
build: ## R-GATE-BUILD — production build succeeds
	pnpm run build

# --- Composite gate (husky / CI entry point) -------------------------------
# Runs R-GATE-LINT -> R-GATE-TYPECHECK -> R-GATE-BUILD in sequence; fails closed.
# Invoked by .husky/pre-commit and CI; mirrored by /said:review-qa.
pre-commit: lint typecheck build ## All gates (husky / CI entry point)
	@echo "OK gates passed: R-GATE-LINT, R-GATE-TYPECHECK, R-GATE-BUILD"

verify: pre-commit ## Alias for pre-commit
