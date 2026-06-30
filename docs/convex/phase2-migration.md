# Phase 2 — migration & hand-off note

How to run, verify, and finish the Convex-backed sandbox migration. Pairs with
[`phase2-architecture.md`](./phase2-architecture.md).

## What shipped on `convex-sandbox-phase2`

| § | Commit | What |
|---|---|---|
| 1 | `Sandbox → Convex (§1/n)` | 10 wallet-scoped schema tables (additive; running app untouched) |
| 2 | `(§2/n)` | onboarding extension (X-flow + live-price basket + starter state) + `recordTransaction`/`recordRiskSnapshot`/reads + liquidation recording + 13 convex-tests |
| 3 | `(§3/n)` | authed SIWE wallet becomes the session identity; `AutoSiwe` auto-prompt |
| 4 | `(§4/n)` | `SandboxGate` (fail-open) + `HeaderLocked` + `OnboardingFlow` + `/onboarding` |
| 8a | `(§8a/n)` | every lend market row/card clicks through to its detail page |
| 6 | `(§6/n)` | multi-user Convex harness + fast-check property |
| 9 | this note + `phase2-architecture.md` | architecture + migration notes |

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
with a starter LP position + portfolio snapshot in Convex.

## Verification gate (§8) — checklist before prod keys

- [ ] `npm test` green (all convex-test + unit suites).
- [ ] Connect + sign-in → onboarding flow runs to `done`; `getState` reflects each step.
- [ ] After claim, the dashboard/portfolio shows the Convex starter position (not mock).
- [ ] Every lend market row opens `/lend/markets/[marketId]` (✅ §8a).
- [ ] Sign out → public demo still renders (fail-open gate).
- [ ] Dashboard + Rewards read wallet-scoped Convex state (see "remaining cutover").

## Remaining cutover (not yet done)

1. **§5 full** — adapter execute persists best-effort today; the UI still reads the
   in-browser session. To make Convex the live source: have `useBorrow/Lend/Multiply
   Session` subscribe to `getPositions`/`getPortfolio` (via `useQuery`) when signed in,
   and drop the localStorage path for authed wallets. Borrow/multiply hooks need an
   injection seam like lend's `injectedTransactionAdapter`.
2. **§7 full** — point the dashboard/rewards live sources (`livePortfolioPageSource`,
   `liveRewardsPageSource`) at Convex and flip `AVANA_DATA_SOURCE=live`; seed the new
   tables from a deterministic builder; **convert the public `seed.ts` + `prices.ts`
   writer mutations to `internalMutation`** (currently world-writable — call them via an
   internal action / `npx convex run` deploy hook). See `phase2-mock-audit.md`.
3. **Server-side recompute** — optionally re-run the engine inside `recordTransaction`
   for trustless validation (engines are pure; bundling `@/app/lib/*` into `convex/`
   needs path-alias resolution). Sandbox-acceptable to defer.
4. **Liquidation execution** — sandbox keeps it preview-only; `recordLiquidation`
   stores analytics only. Enabling real state changes is a separate decision.

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
- **Gate is fail-open and only engages for signed-in wallets** — the public demo and the
  deployed app must never brick on a Convex/auth hiccup.
- **X/tweet step is in scope** (the brief's §2 names `xPending`); `confirmTweet` is a
  sandbox attestation with no server-side tweet verification.
- **Best-effort persistence in §5** keeps the proven in-browser UX while Convex receives
  a durable copy — the safe intermediate before full subscription cutover.
