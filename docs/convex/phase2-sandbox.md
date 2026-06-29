# Phase 2 — Convex-backed sandbox + real wallet auth

Migrate the sandbox from in-browser mock data to **Convex-backed, wallet-scoped state**, and replace
the mock/session wallet with **real wallet connect + authentication** — while keeping simulated
actions, synthetic receipts, and the adapter boundary intact (no real contract writes, no Ponder).

## Target architecture (unchanged from the brief)

```
Wallet connect (ConnectKit) → authenticate → Convex identity (ctx.auth)
  → SandboxGate (onboarding/profile state)
  → UI reads wallet-scoped sandbox state from Convex
  → action box → SandboxTransactionAdapter
  → Credit Engine preflight/simulation (analytics only, no persisted state)
  → Convex mutation: verifies authed wallet ownership → updates wallet-scoped state → synthetic receipt
  → UI updates reactively
```

Production rule preserved: **Convex is the source of truth for sandbox state only.** In prod, truth
comes from contracts + indexed onchain data; the Credit Engine stays simulation/analytics only.

## The auth decision (needs your call + keys)

ConnectKit's SIWE flow (`connectkit-next-siwe`) issues a **cookie session**, but Convex `ctx.auth`
needs a **JWT issuer** registered in `convex/auth.config.ts`. Two compatible paths:

- **A. ConnectKit (connect UI) + Privy as the Convex issuer** — Privy issues a Convex-verifiable JWT;
  `auth.config.ts` registers Privy's domain/JWKS. Matches your notes (`privyUserId`, "Privy JWT →
  Convex auth"). Lowest-friction Convex integration. Needs a Privy app + WalletConnect projectId.
- **B. ConnectKit SIWE + a custom JWT bridge** — after SIWE verify, mint a short-lived JWT (wallet in
  `subject`) signed by a key whose JWKS is registered in `auth.config.ts`; hand it to
  `ConvexProviderWithAuth`. Pure ConnectKit, but you own key/JWKS management. Needs `SESSION_SECRET` +
  a signing key + WalletConnect projectId.

The Convex functions are written **issuer-agnostic**: they read the wallet from `ctx.auth` and never
trust a client-passed wallet, so either path drops in without changing the mutations.

External items only you can provide: WalletConnect Cloud projectId, the auth issuer (Privy app or
signing key + JWKS), `SESSION_SECRET` (path B), and the **production Convex URL** (`npx convex deploy`
→ set `NEXT_PUBLIC_CONVEX_URL` in Vercel). Add an **hourly per-user transaction rate limit** in the
mutation layer (Convex rate-limiter component) once auth is wired.

## Status

**Done (this slice — additive, tested, does not touch the running mock app):**
- Schema: `sandboxEconomy`, `sandboxConfig`, `sandboxProfiles` (idx `by_wallet`, `by_authSubject`),
  `sandboxActivity` (idx `by_wallet_at`). (`marketLiquidityDeltas` shipped in phase 1.)
- `convex/sandbox/auth.ts` — `requireSandboxWallet`: derives wallet from `ctx.auth`, rejects
  unauthenticated / mismatched calls. Never trusts the client wallet.
- `convex/sandbox/onboarding.ts` — `getState` (own wallet only), `startAnalysis` (deterministic
  eligibility tier in [0.8, 1.2]), `claim` (server-enforced `userCap` + `totalGrantedUsdCap`, basket
  allocation, atomic economy increment, activity row, synthetic claim receipt, waitlist on cap).
- Tests (`convex/onboarding.test.ts`, convex-test + edge-runtime): unauth reject, wallet-mismatch
  reject, claim happy-path + atomic economy increment + single activity row, userCap → waitlist.

**To do (subsequent test-gated slices, several need the keys above):**
- ConnectKit + wagmi + viem + react-query provider tree; `auth.config.ts`; the chosen auth bridge.
- `SandboxGate` + locked shell + onboarding UI flow (wallet → analyzing → eligible → xPending →
  claimPending → done → waitlisted).
- Migrate the remaining sandbox state to Convex (markets/pools/positions/debt/collateral/transactions/
  riskSnapshots/liquidations/portfolioSnapshots/tokens) and rewire `SandboxTransactionAdapter` to call
  Convex mutations instead of the in-browser mock layer (keep `ProductionTransactionAdapter` a stub).
- Hourly per-user transaction rate limit.
- Multi-user harness (calm / borrowHeavy / capRush / liquidationStorm) + invariant checks.
- Token price ingestion actions/crons (DefiLlama/CoinGecko/subgraphs) replacing the sandbox fallback
  price map.

## Notes
- `claim` uses a **sandbox fallback price map**; production reads `tokens.priceUsd` from ingestion.
- Eligibility tier uses a deterministic string hash as a sandbox stand-in for `keccak256(wallet)`.
- Mutations are transactional; concurrent claims serialize via Convex OCC, so the `capRush` invariant
  (exactly `userCap` succeed) holds without client coordination.
