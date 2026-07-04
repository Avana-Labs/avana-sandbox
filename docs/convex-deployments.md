# Convex deployments — topology, safety, and auth wiring

_Last verified 2026-07-03._

## TL;DR

- There is **one cloud Convex deployment in active use: `resolute-eel-426`** — the **production** deployment of the `dex-mini:convex-avana-dev` project.
- **Both** the Vercel-hosted app **and** local `npm run dev` currently read it, via the single `NEXT_PUBLIC_CONVEX_URL` env var. The app is single-sourced — there is no dev/prod data split feeding it.
- ⚠️ **The hazard:** because local dev also points at `resolute-eel-426`, **running the app locally reads _and writes_ production data** (test onboarding creates real prod profiles/positions, and `npx convex deploy` pushes to prod). Fix this by giving local development its own deployment (below).
- **Do NOT "delete dev to have one source."** Production is already the single source of truth for users. What's missing is a _non-prod_ target to develop against safely. Deleting your dev/local backend removes the safety net; it does not consolidate anything.

## What points where

| Consumer | Env var | Value | Notes |
|---|---|---|---|
| Client realtime (`ConvexReactClient`) | `NEXT_PUBLIC_CONVEX_URL` | prod URL | `app/lib/convex/market-liquidity-provider.tsx` |
| Client authed queries (`ConvexHttpClient`) | `NEXT_PUBLIC_CONVEX_URL` | prod URL | `app/lib/data/providers/live-convex-client.ts` |
| SSR hydration (borrow/lend/multiply) | `NEXT_PUBLIC_CONVEX_URL` | prod URL | `app/lib/*/market-hydration-server.ts` |
| CSP `connect-src` | `NEXT_PUBLIC_CONVEX_URL` + `_SITE_URL` | prod origins | `next.config.mjs` — must allow the WS + HTTP origin or every query is silently blocked |
| `convex deploy` / `convex run` | `CONVEX_DEPLOY_KEY` | prod key | targets `resolute-eel-426` |

No hardcoded `.convex.cloud` URLs exist in source; everything is env-driven.

## Recommended: isolate local development from production

Pick one:

**Option A — cloud dev deployment (recommended).** Each developer gets their own free dev deployment.
1. In `.env.local`, comment out the prod `CONVEX_DEPLOY_KEY` + `NEXT_PUBLIC_CONVEX_URL` lines.
2. Run `npx convex dev` — it creates/uses a personal dev deployment and writes its `CONVEX_DEPLOYMENT` + `NEXT_PUBLIC_CONVEX_URL` for you.
3. Seed it: `npx tsx scripts/seed-convex.ts` (needs `CONVEX_SEED_SECRET` set on that deployment).

**Option B — local open-source backend.** Uncomment the `local:` block already in `.env.local` and run `npx convex dev`. A ~479 MB local backend lives in `.convex/local/`; delete that dir to reclaim disk if you switch to Option A.

**Deploying to prod** stays explicit and deliberate: `npx convex deploy` (schema + functions) and, when market-level data changes, `npx tsx scripts/seed-convex.ts --markets-only`.

## Auth wiring (SIWE → JWT) — the "wallet sign-in" footgun

The app mints an RS256 JWT (`app/lib/siwe/jwt.ts`, signed with `SIWE_JWT_PRIVATE_JWK`) and Convex verifies it (`convex/auth.config.ts`) by fetching `${issuer}/.well-known/{openid-configuration,jwks.json}` from the app origin.

**These two must be the SAME exact string** (both sides now strip a trailing slash defensively):

| Next app (Vercel) | Convex deployment |
|---|---|
| `NEXT_PUBLIC_SIWE_ISSUER` | `SIWE_JWT_ISSUER` |

Currently both are `https://avana-webapp.vercel.app` ✅.

**Why sign-in breaks:** if `NEXT_PUBLIC_SIWE_ISSUER` is unset on a deployment, the token `iss` falls back to the _request origin_ — so a user arriving on a **preview URL or a secondary Vercel alias** (e.g. `avana-ashen.vercel.app`, which currently serves a stale build with no working `/.well-known/` route) mints a token whose `iss` doesn't match `SIWE_JWT_ISSUER`, and Convex rejects it (`UNAUTHENTICATED`).

**Rules to keep auth healthy:**
1. Always keep `NEXT_PUBLIC_SIWE_ISSUER` (Vercel) === `SIWE_JWT_ISSUER` (Convex).
2. Prefer a **stable custom domain** as the issuer so it never drifts with Vercel-generated aliases/preview URLs.
3. Send users to the canonical origin only. Retire/redirect stale aliases like `avana-ashen.vercel.app`.
4. The issuer origin must serve `/.well-known/openid-configuration` + `/.well-known/jwks.json` (rewritten in `next.config.mjs`) and be reachable by the Convex backend.

## Env var reference

| Var | Scope | Set on | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | public | Next/Vercel | data deployment URL (client + server) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | public | Next/Vercel | HTTP-actions origin; only used in the CSP `connect-src` |
| `NEXT_PUBLIC_SIWE_ISSUER` | public | Next/Vercel | token `iss`; **must equal Convex `SIWE_JWT_ISSUER`** |
| `SIWE_JWT_PRIVATE_JWK` | secret | Next/Vercel | RS256 signing key (prod supplies its own) |
| `SIWE_JWT_ISSUER` | secret | Convex deployment | issuer Convex trusts + JWKS origin |
| `CONVEX_DEPLOY_KEY` | secret | Next/Vercel | targets a deployment for `convex deploy` |
| `CONVEX_SEED_SECRET` | secret | Convex deployment | gates the `seedAdmin.*` seed actions |
