#!/usr/bin/env bash
# Create every leftover issue on GitHub. Requires: gh (authenticated) + repo access.
#   gh auth login   # once, then:   ./create-issues.sh
set -euo pipefail
REPO="Avana-Labs/avana-webapp"
cd "$(dirname "$0")"

# Ensure labels exist (idempotent).
gh label create high   --repo "$REPO" --color d73a4a --description "High priority"   2>/dev/null || true
gh label create medium --repo "$REPO" --color fbca04 --description "Medium priority" 2>/dev/null || true
gh label create low    --repo "$REPO" --color 0e8a16 --description "Low priority"    2>/dev/null || true
gh label create ui     --repo "$REPO" --color 1d76db --description "UI / UX"         2>/dev/null || true
gh label create data   --repo "$REPO" --color 5319e7 --description "Data / trust"    2>/dev/null || true
gh label create infra  --repo "$REPO" --color 555555 --description "Infra / deploy"  2>/dev/null || true
gh label create qa     --repo "$REPO" --color c2e0c6 --description "QA / inspection" 2>/dev/null || true

gh issue create --repo "$REPO" --title 'Tokenize positive/APY greens onto the success token' --label high --label ui --body-file 01-tokenize-positive-apy-greens-onto-the-success-token.md
gh issue create --repo "$REPO" --title 'Add a shared formatPercent helper (one APY/percent decimal convention)' --label high --label ui --body-file 02-add-a-shared-formatpercent-helper-one-apy-percent-decimal-co.md
gh issue create --repo "$REPO" --title 'Consolidate the radius scale (remaining Uniswap-token foundation)' --label high --label ui --body-file 03-consolidate-the-radius-scale-remaining-uniswap-token-foundat.md
gh issue create --repo "$REPO" --title 'Introduce one shared Button and route all CTAs/tabs/segments through it' --label high --label ui --body-file 04-introduce-one-shared-button-and-route-all-ctas-tabs-segments.md
gh issue create --repo "$REPO" --title 'Give /actions/* pages a real header (one action shell)' --label high --label ui --body-file 05-give-actions-pages-a-real-header-one-action-shell.md
gh issue create --repo "$REPO" --title 'Homepage express + search polish (search modal, express affordance, mobile tab wrap)' --label high --label ui --body-file 06-homepage-express-search-polish-search-modal-express-affordan.md
gh issue create --repo "$REPO" --title 'Single source of truth for market numbers (cross-page + within-page consistency)' --label high --label data --body-file 07-single-source-of-truth-for-market-numbers-cross-page-within-.md
gh issue create --repo "$REPO" --title 'Dashboard: fix Net Value $1.58M, cap Max-Borrow ≤ collateral, fix position→row mismap' --label high --label data --body-file 08-dashboard-fix-net-value-1-58m-cap-max-borrow-collateral-fix-.md
gh issue create --repo "$REPO" --title 'Multiply risk params impossible (CF > LT) — merge dual catalogs + validate LT>CF' --label high --label data --body-file 09-multiply-risk-params-impossible-cf-lt-merge-dual-catalogs-va.md
gh issue create --repo "$REPO" --title 'Borrow health-factor formula uses max-LTV instead of liquidation threshold' --label high --label data --body-file 10-borrow-health-factor-formula-uses-max-ltv-instead-of-liquida.md
gh issue create --repo "$REPO" --title 'Homepage express borrow can'"'"'t be completed (LP picker $0; Repay wrong default asset)' --label high --label data --body-file 11-homepage-express-borrow-can-t-be-completed-lp-picker-0-repay.md
gh issue create --repo "$REPO" --title 'Deploy hygiene: committed .next-prod build has the auth gate baked OPEN' --label high --label infra --body-file 12-deploy-hygiene-committed-next-prod-build-has-the-auth-gate-b.md
gh issue create --repo "$REPO" --title 'Sticky CTA on /actions/* configure + review pages (mobile)' --label medium --label ui --body-file 13-sticky-cta-on-actions-configure-review-pages-mobile.md
gh issue create --repo "$REPO" --title 'Rewards accounting: pending increases on claim; balance not durable' --label medium --label data --body-file 14-rewards-accounting-pending-increases-on-claim-balance-not-du.md
gh issue create --repo "$REPO" --title 'Receipt deep-link renders an empty page' --label medium --label ui --body-file 15-receipt-deep-link-renders-an-empty-page.md
gh issue create --repo "$REPO" --title 'Action-page hydration mismatch (aria-haspopup dialog vs listbox)' --label medium --label ui --body-file 16-action-page-hydration-mismatch-aria-haspopup-dialog-vs-listb.md
gh issue create --repo "$REPO" --title 'Dashboard portfolio hero flip-flops between tabs' --label medium --label data --body-file 17-dashboard-portfolio-hero-flip-flops-between-tabs.md
gh issue create --repo "$REPO" --title 'Currency not applied everywhere; desktop currency is a cycling icon' --label medium --label ui --body-file 18-currency-not-applied-everywhere-desktop-currency-is-a-cyclin.md
gh issue create --repo "$REPO" --title 'Convex resilience: gate timeout, wrap mutations, reachable deployment' --label medium --label infra --body-file 19-convex-resilience-gate-timeout-wrap-mutations-reachable-depl.md
gh issue create --repo "$REPO" --title 'Add loading/error boundaries; guard multiply visuals[0/1]' --label medium --label ui --body-file 20-add-loading-error-boundaries-guard-multiply-visuals-0-1.md
gh issue create --repo "$REPO" --title 'Unify blocked-modal titles, empty-state phrases, and APR/APY + detail metric labels' --label medium --label ui --body-file 21-unify-blocked-modal-titles-empty-state-phrases-and-apr-apy-d.md
gh issue create --repo "$REPO" --title 'Multiply Max fills market liquidity, not wallet balance' --label medium --label ui --body-file 22-multiply-max-fills-market-liquidity-not-wallet-balance.md
gh issue create --repo "$REPO" --title 'Dead/unclear Settings gear on the homepage express widget' --label medium --label ui --body-file 23-dead-unclear-settings-gear-on-the-homepage-express-widget.md
gh issue create --repo "$REPO" --title 'LP product-name inconsistency + stale chart date ranges' --label medium --label ui --body-file 24-lp-product-name-inconsistency-stale-chart-date-ranges.md
gh issue create --repo "$REPO" --title 'Audit mobile card surface treatments for consistency' --label medium --label ui --body-file 25-audit-mobile-card-surface-treatments-for-consistency.md
gh issue create --repo "$REPO" --title 'Trending card shows an unlabeled 2nd $ metric' --label low --label ui --body-file 26-trending-card-shows-an-unlabeled-2nd-metric.md
gh issue create --repo "$REPO" --title '"Conservative Strategy" lists a 30% APY asset as low-risk' --label low --label data --body-file 27-conservative-strategy-lists-a-30-apy-asset-as-low-risk.md
gh issue create --repo "$REPO" --title 'Withdraw review shows already-earned interest decreasing' --label low --label data --body-file 28-withdraw-review-shows-already-earned-interest-decreasing.md
gh issue create --repo "$REPO" --title 'Lend Avg Utilization is non-deterministic across loads' --label low --label data --body-file 29-lend-avg-utilization-is-non-deterministic-across-loads.md
gh issue create --repo "$REPO" --title 'Dashboard quick-action icons are inconsistently styled' --label low --label ui --body-file 30-dashboard-quick-action-icons-are-inconsistently-styled.md
gh issue create --repo "$REPO" --title 'Coinbase Wallet SDK telemetry fires on every navigation' --label low --label infra --body-file 31-coinbase-wallet-sdk-telemetry-fires-on-every-navigation.md
gh issue create --repo "$REPO" --title 'Client refetches pop in without a skeleton' --label low --label ui --body-file 32-client-refetches-pop-in-without-a-skeleton.md
gh issue create --repo "$REPO" --title 'Missing empty state (multiply) + unrendered portfolio error' --label low --label ui --body-file 33-missing-empty-state-multiply-unrendered-portfolio-error.md
gh issue create --repo "$REPO" --title 'Wallet pill truncates to "TEST WAL…"' --label low --label ui --body-file 34-wallet-pill-truncates-to-test-wal.md
gh issue create --repo "$REPO" --title 'Near-liquidation multiply shows only a soft "Caution"' --label low --label ui --body-file 35-near-liquidation-multiply-shows-only-a-soft-caution.md
gh issue create --repo "$REPO" --title 'Copy/label nits: grammar + activity label' --label low --label ui --body-file 36-copy-label-nits-grammar-activity-label.md
gh issue create --repo "$REPO" --title 'Heading sizes bypass the globals h1/h2/h3 scale' --label low --label ui --body-file 37-heading-sizes-bypass-the-globals-h1-h2-h3-scale.md
gh issue create --repo "$REPO" --title 'Minor number drift: $16.12 vs $16.13; Average APY vs Net APY' --label low --label data --body-file 38-minor-number-drift-16-12-vs-16-13-average-apy-vs-net-apy.md
gh issue create --repo "$REPO" --title 'End-to-end UI/UX + code inspection pass (comprehensive QA)' --label high --label qa --body-file 39-end-to-end-ui-ux-code-inspection-pass-comprehensive-qa.md
