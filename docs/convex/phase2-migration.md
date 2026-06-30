# Phase 2 — migration & hand-off note

How to run, verify, and finish the Convex-backed sandbox migration. Pairs with
[`phase2-architecture.md`](./phase2-architecture.md).

## What shipped on `convex-sandbox-phase2`

| § | Commit | What |
|---|---|---|
| 1 | `Sandbox → Convex (§1/n)` | 10 wallet-scoped schema tables (additive; running app untouched) |
| 2 | `(§2/n)` | onboarding extension (X-flow + live-price basket + starter state) + `recordTransaction`/`recordRiskSnapshot`/reads + liquidation recording + 13 convex-tests |
| 3 | `(§3/n)` | authed SIWE wallet becomes the session identity; `AutoSiwe` auto-prompt |
| 4 | `(§4/n)` | fail-closed `SandboxGate` + shared Avana header + `OnboardingFlow` + `/onboarding` |
| 8a | `(§8a/n)` | every lend market row/card clicks through to its detail page |
| 6 | `(§6/n)` | multi-user Convex harness + fast-check property |
| 9 | this note + `phase2-architecture.md` | architecture + migration notes |
| 10 | `eebaadb` | deterministic diversified $1M starter portfolio across assets, LP collateral, lend and multiply |
| 11 | `9962fdf` | live Convex providers become the default; mock mode requires an explicit flag |
| 12 | `46eb018` | market seed writes move behind secret-guarded actions and internal mutations |
| 13 | `63a2411` | adapters persist to Convex before committing browser state |
| 14 | `f221ea0` | authenticated sessions start empty and rehydrate only from Convex |

## Running locally

```bash
npx convex dev            # local open-source backend (CONVEX_DEPLOYMENT=local in .env.local)
npm run dev               # Next.js
npx convex run prices:refreshPrices   # populate tokenPrices (DefiLlama, no key)
npx tsx scripts/seed-convex.ts        # seed market-data tables (markets/dailyStats/…)
npm test                  # vitest (incl. all convex-test suites)
```

The sandbox is exercised by: connect a wallet → auto-SIWE (or the header "Sign in")
→ the gate shows onboarding → analyze → (optionally share on X) → claim → unlocked app
with a deterministic $1M starter portfolio and portfolio snapshot in Convex.

## Verification gate (§8) — checklist before prod keys

- [ ] `npm test` green (all convex-test + unit suites).
- [ ] Connect + sign-in → onboarding flow runs to `done`; `getState` reflects each step.
- [ ] After claim, the dashboard/portfolio shows the Convex starter position (not mock).
- [ ] Every lend market row opens `/lend/markets/[marketId]` (✅ §8a).
- [ ] Sign out → onboarding remains locked until a wallet signs in.
- [ ] Dashboard + Rewards read wallet-scoped Convex state (see "remaining cutover").

## Remaining cutover

1. **Server-side recompute** — re-run product validation inside `recordTransaction`
   instead of accepting a client-computed before/after state.
2. **Liquidation execution** — atomically update debt/collateral and create a
   liquidation action for every newly underwater position.
3. **Catalog removal** — the live list providers require Convex numeric snapshots but
   still use deterministic TypeScript catalogs for engine configuration and display
   shape. Seed those remaining fields and construct the read models directly from
   Convex before deleting the catalog builders.
4. **Real-wallet E2E** — Playwright exercises the state machine with injected valid
   JWTs. A browser wallet signer is still required to automate the actual ConnectKit
   signature prompt.

## GATED — needs you (§10)

These cannot be completed without credentials/decisions only the owner can provide:

- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** in Vercel — without it the Connect modal
  lists only injected/MetaMask/Coinbase (no WalletConnect wallet list). `web3-provider`
  already branches on its presence.
- **Production SIWE signing key** — set `SIWE_JWT_PRIVATE_JWK` (RSA, RS256),
  `SIWE_JWT_ISSUER` (Convex env) and `NEXT_PUBLIC_SIWE_ISSUER` (Next) to the public app
  URL. They MUST match the token `iss` or Convex verification silently fails. The JWKS
  route would 500 without the key.
- **4B prod deploy** — `npx convex deploy`, then set `NEXT_PUBLIC_CONVEX_URL` in Vercel
  to the deployed URL (today it points at `127.0.0.1`, so the deployed app falls back to
  the local in-memory ledger). Run the seed against the prod deployment.
- **WalletConnect ↔ deploy ordering** — the seed script reads `NEXT_PUBLIC_CONVEX_URL`
  and requires functions already deployed (`npx convex deploy` first).

## Decisions taken (so a reviewer can challenge them)

- **Unified `positions` table** with a `product` discriminator (vs per-product tables) —
  matches the names in the brief and keeps reads simple; multiply fields are nullable
  number columns alongside the usd6-string borrow/lend columns.
- **`transactions` is the rich per-wallet ledger**; `sandboxActivity` stays the
  onboarding-claim log; `getActivity` merges both. (Full unification deferred.)
- **Gate is fail-closed** — unauthenticated and backend-error states stay inside
  onboarding. The normal Avana header remains visible, but protected routes do not
  render until Convex reports `onboardingStep === "done"`.
- **X/tweet step is in scope** (the brief's §2 names `xPending`); `confirmTweet` is a
  sandbox attestation with no server-side tweet verification.
- **Convex-first adapter execution** persists the simulated result before committing
  browser state. A failed Convex write cannot create a locally successful transaction.
