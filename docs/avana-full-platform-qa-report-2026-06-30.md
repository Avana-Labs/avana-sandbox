# Avana Full-Platform QA Report — 2026-06-30

Branch: `convex-sandbox-phase2`. Scope: end-to-end QA + code/data/scalability review of
the live-Convex-backed sandbox (Borrow, Lend, Multiply, Repay, Withdraw, Dashboard,
Onboarding), desktop + mobile, plus fixes for the serious issues found.

## Methodology (what was actually exercised, not just read)

- **Ran the real app**: local Convex backend (`:3210`, seeded — 173 markets) + Next dev
  (`:3000`) + a production build (`:3002`) for Lighthouse.
- **Drove the UI headlessly with Playwright** (real Chromium → real screenshots), using
  the built-in test-mode auth path (`NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=1` + a dev-minted
  SIWE JWT) to reach the authenticated flows — the whole app now sits behind a SIWE
  onboarding gate, so authed coverage was essential.
- Captured console errors, page errors, failed network requests, horizontal-overflow,
  and unresolved loading states across `/`, `/express`, `/borrow`, `/lend`, `/multiply`,
  `/dashboard`, `/rewards`, `/support-center`, `/onboarding` at desktop (1280/1440/1920)
  and mobile (iPhone SE 375, standard 390, Pro Max 430, Android 360, tablet 768).
- **Ran a 58-agent adversarial code audit** over the engines, Convex functions, providers
  and the branch diff (correctness / money-flow / security / scalability / data-integrity
  / dead-code), with every finding independently verified → 44 confirmed.
- Baseline gates all green: `tsc` clean, `eslint` 0 errors, **686 unit/integration tests**
  pass, prod build compiles.

## Verdict

The platform is **fundamentally sound and now materially closer to production-ready**, but
it shipped with **two release-blocking defects that this pass fixed** (the authenticated
app was effectively broken in production, and lend was broken for every non-stablecoin),
plus a cluster of security/scalability gaps that are now closed or mitigated. Remaining
items are medium/low and documented below.

---

## Release-blockers found & FIXED

### 1. CRITICAL — CSP blocked the Convex client → entire authed app empty in prod
The production CSP was `connect-src 'self' https:` — **missing `wss:`**, the transport
Convex's realtime client uses. Every client-side `useQuery`/`useMutation` (dashboard
portfolio, authed sessions, the shared liquidity ledger) was blocked; locally the
`http://127.0.0.1:3210` origin was absent too. The dashboard rendered blank.
**Fix**: derive the exact Convex origins (http+ws / https+wss) from the env and add
`wss:`. Verified the dashboard then loads and `POST /api/query` → 200.
_Repro_: build prod, sign in, open `/dashboard` → blank; console shows
`connect-src ... blocked`. (commit `2271de7`)

### 2. CRITICAL — Lend deposit/withdraw broke for every non-$1 asset
`lendResultToRecordArgs` sent the **token-denominated** amount (e.g. `0.1 wstETH`) as the
**USD** amount, but the server reconciles the supplied balance in USD, so any asset whose
price ≠ $1 (ETH, BTC, stETH, …) threw `INVALID_TRANSITION` on execute — silently
restricting lend to stablecoins. **Fix**: convert via `assetPriceUsd`. _Verified
end-to-end_: a `0.1 wstETH` withdraw now succeeds, supplied **$37,500 → $37,120** (exact
−$380). (commit `9693be7`, + regression tests)

---

## Security — FIXED

- **HIGH — `liquidity.recordDelta` was public/unauthenticated**: anyone could corrupt the
  shared market ledger for all users (or fold an astronomical value). Now requires a
  signed-in wallet + clamps the delta. Verified: unauth rejected, auth accepted. (`a6e081d`)
- **HIGH — SIWE signatures were origin-unbound**: the verify route never checked the
  EIP-4361 domain/URI, so a signature phished on another site could be relayed to mint a
  sandbox JWT here. Now validated against the request host. (`ed48672`)
- **HIGH/MED — server trusted client borrow solvency + multiply leverage**: the Convex
  write path re-derived lend/multiply ratios but not **borrow** solvency, and never capped
  multiply leverage. A tampered client could persist an underwater (HF<1) or unbacked
  borrow, or a >10× multiply. Added `assertBorrowSolvent` (re-derives the liquidation value
  from the pledged pools' real thresholds, never the client HF) + a server multiply cap.
  4 new tests. (`6ab1c82`)

> The `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE` bypass (audit M4) is `NEXT_PUBLIC_`-gated and only
> trusts a localStorage token in test mode — confirm it is unset in the production build
> env (it is inert otherwise).

## Performance — Lighthouse 65 → 99 (FIXED)

Profiling the production build showed a single third-party script —
`app.family.co/cdn-cgi/challenge-platform` (a Cloudflare bot challenge inside a
ConnectKit-preloaded Family iframe) — burning **~3.1s of main-thread time on every page**
(Total Blocking Time 1,540 ms). It is not needed for injected/MetaMask/Coinbase/
WalletConnect wallets. Removing it from `frame-src`:

| metric | before | after |
|---|---|---|
| Performance | 65 | **99** |
| Total Blocking Time | 1,540 ms | **0 ms** |
| JS bootup | 3.8 s | 0.2 s |
| Speed Index | 1.9 s | 0.4 s |

Verified the Connect modal still opens / wallet selection still works. FCP 0.3s / LCP
1.0s / CLS 0.002 were already excellent. (commit `7c8478b`)

## Scalability (1,000 concurrent users)

- **FIXED — per-wallet portfolio query read the whole 173-market catalog** on every authed
  dashboard load (uncached, per wallet). Now fetches only the markets/pools a wallet's
  positions reference (markets **173 → 14** for a typical wallet) + parallel hydration +
  bounded rate-limit read. (`237f6ae`)
- **FIXED — transaction-by-hash scanned the wallet's whole history**; added a
  `by_wallet_hash` index. (`5ad27af`)
- **FIXED — engagement query collected `walletEvents` twice** per detail load; collect once.
  (`a9eb46a`)
- **Assessment**: the list/economy queries (`listMarketSnapshots`, `getBorrowEconomy`) are
  N+1 over 173 markets but are **no-arg queries → shared across all clients by Convex's
  query cache**, so 1,000 viewers share one computation; acceptable. The per-wallet reads
  were the real risk and are now trimmed. **What breaks first at scale**: the borrow market
  list renders all 64 rows / ~137 remote token-logo images with **no virtualization**
  (16,995px mobile page) — recommend windowing + a local logo fallback. RPC/wallet provider
  fan-out is mocked in the sandbox (no real chain calls).

## Product flows

| Flow | Status |
|---|---|
| **Onboarding / SIWE gate** | ✓ connect → analyze → eligible → claim → done; $1M starter portfolio persists per wallet in Convex. |
| **Borrow** | ✓ list/detail render Convex-backed ($1.6B TVL / $900M credit / $700M loans); server solvency now enforced. Home Express borrow card starts at $0 (pick-a-pool) — see Open items. |
| **Lend** | ✓ list/detail; deposit/withdraw **now work for all assets** (was the critical bug); APY/balances consistent; hero TVL no longer re-parsed from a formatted string (`cc4c529`). |
| **Multiply** | ✓ list (paginated, 20 markets), truthful leverage (×3 inflation already removed — confirmed), debt/liquidation shown, deleverage works. |
| **Dashboard / positions** | ✓ borrow/lend/multiply tabs, activity, health — now with a loading skeleton + retryable error state instead of a silent blank screen (`7e29b7a`). Reflects persisted actions (verified withdraws moved the lending total). |
| **Repay / Withdraw** | ✓ exercised via the action modal (configure → review → sign → success). |

## UI / responsive

- **FIXED — header search overlapped/clipped the "Multiply" nav link** at 1024–1440px
  (absolute-centered search vs. an independently-growing nav) → moved to in-flow centered
  column. (`04adce1`)
- **FIXED — console noise on every page**: ConnectKit/Family + WalletConnect frames were
  CSP-blocked (console error + cross-origin localStorage throw) and `ambient-light-sensor`
  was an unrecognized Permissions-Policy feature. Console is now clean (modulo the
  intentional family.co block + local-only Vercel-insights 404s). (`f4a15c5`)
- **Mobile**: no horizontal overflow at any tested width; no app console errors; multiply
  paginates. The "N · 2 Issues" chip seen on mobile is the **Next.js dev indicator**
  (dev-only, not user-facing).

## Code quality

- Removed dead code (orphaned `borrow-data.ts`, unused exports/imports), restored 0-error
  lint, added regression tests. (`c645bb2`, `d29b4c3`)
- Tightened the borrow/withdraw guard to reject opening **exactly at** the liquidation
  boundary (HF ≤ 1). (`5df5a52`)

---

## Open items (recommendations, not done this pass)

1. **Borrow capacity should bind on the collateral factor, not the liquidation threshold**
   (audit L1) — a borrow can currently approach the liquidation LTV. Deeper credit-engine
   rework; the HF≤1 guard above is a partial mitigation.
2. **Virtualize the borrow market list** + add a local token-logo fallback (perf/UX at
   scale; 64 rows / ~137 remote images, no windowing).
3. **Home Express borrow card** does not pre-populate the authenticated wallet's pools
   (shows Collateral $0 / generic "LP"); the dashboard is the correct positions view.
4. **Persist failed/blocked transactions** (audit L13) — they append a local-only history
   row, so authed activity diverges on refresh.
5. **Session hydration replaces the whole positions map** (audit L12) — can clobber
   optimistic local state on a mid-flight multi-tab push.
6. **Liquidity ledger `suppliedDeltaUsd` is written but never read** (audit M7/M8) — supply
   activity doesn't move pool TVL anywhere; the borrow hero also ignores the live ledger.
7. **Remove the dead client `ledger` arg** to `recordTransaction` (server recomputes it).
8. **Genuine wallet-signature E2E** needs real test-wallet credentials; this pass used the
   built-in test-mode auth path instead.

## Gate status at report time
`tsc` clean · `eslint` 0 errors · **686 tests pass** · prod build compiles · Lighthouse
(prod, `/onboarding`) **Performance 99**.
