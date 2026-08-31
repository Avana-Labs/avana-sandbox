# Performance Improvement Runbook

A commit-by-commit plan to fix the `/` landing-route load performance and the font-swap
flash. **Each commit is isolated and gated by a measurement.** Ship one, measure it against
the baseline, and only keep it if it beats its gate. If a change is flat, revert it and move
on — do not stack unmeasured changes.

> Why this discipline: this repo has a history of "shipped a fix, no measurable benefit"
> (see the INP work). Mobile single-run Lighthouse variance is ±5–10 points, so a green score
> is not proof. Trust **deterministic byte deltas** for JS-size changes and **median-of-5**
> for timing metrics.

---

## ⚠️ How to measure — and the trap to avoid

**Do NOT validate these fixes with `npm run lighthouse:budgets` / `lighthouse:serve`.**
Those run in **audit mode** (`NEXT_PUBLIC_LIGHTHOUSE_AUDIT_MODE=1`), which makes
`app/layout.tsx` short-circuit to a bare `<html><body>` — **no font, no providers, no
`loadServerTokenPrices`, no onboarding gate.** The harness even asserts the page is _not_ the
onboarding surface (`lighthouse-budgets.mjs:103`). It measures a synthetic page, so it will
show green while the real fixes below are invisible to it. This is the "changing things that
never improve" trap.

Use these real measurements instead:

| Signal                        | Command / method                                                                                                                                                                                                                             | Deterministic?   | Use for          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| **Bundle bytes**              | `npm run build` → read **First Load JS** for `/` in the route table. Deeper: `npm run analyze`.                                                                                                                                              | ✅ Yes           | C2, any JS cut   |
| **Lab FCP/LCP/TBT**           | `npm run build && npm run start`, then `npx lighthouse http://localhost:3000/ --only-categories=performance --form-factor=mobile --output=json --output-path=lh.json --chrome-flags="--headless=new"` — run **5×**, take the **median** LCP. | ⚠️ ±variance     | C1, C4, C5       |
| **TTFB + cache headers**      | Deploy the PR → Vercel preview. `curl -sI <preview-url> \| grep -i "cache-control\|x-vercel-cache"` and `for i in $(seq 5); do curl -o /dev/null -s -w "%{time_starttransfer}\n" <preview-url>; done`                                        | ✅ Yes (headers) | C3, C3b          |
| **Font timing / flash**       | DevTools → Network → filter `Font` → check the woff2 request **start time**; screen-record 3 cold loads and watch for a font change.                                                                                                         | ✅ Yes           | C1               |
| **Field truth (lags 24–72h)** | Vercel Speed Insights → RES per route (`/` is the target; it's at 82).                                                                                                                                                                       | ✅ Ground truth  | Final validation |

**Baseline note for lab runs:** local `next start` has no Vercel CDN, so **TTFB locally is not
representative** — measure TTFB only against a Vercel preview (C3/C3b). Everything else (JS
bytes, hydration-bound LCP, font timing) reproduces locally.

**Workflow:** one commit per PR, so a revert is just closing the PR. Tag the starting point:
`git tag perf-baseline`.

---

## Commit 0 — Capture the baseline (no code change)

Fill this table once, before touching anything. Every later commit compares to it.

| Metric                 | How                         | Baseline (fill in) | Source measured so far       |
| ---------------------- | --------------------------- | ------------------ | ---------------------------- |
| `/` First Load JS      | `npm run build` route table | ____               | ~425 KB / 30 files           |
| Mobile LCP (median×5)  | lab lighthouse              | ____               | 2.8 s (lab) / 3.35 s (field) |
| Mobile FCP             | lab lighthouse              | ____               | 1.0 s                        |
| Mobile TBT             | lab lighthouse              | ____               | 100 ms                       |
| Unused JS on `/`       | lighthouse audit            | ____               | 84 KB (60 KB in one chunk)   |
| Cold TTFB              | curl preview ×5             | ____               | 510 ms cold / 166 ms warm    |
| `cache-control` header | curl preview                | ____               | `no-store` (bf-cache off)    |
| Font woff2 start       | DevTools Network            | ____               | 798 ms (after load event)    |
| Field RES `/`          | Speed Insights              | ____               | 82                           |

---

## Commit 1 — Font preload + no-swap (kills the flash) · P0 · confidence HIGH · ~2 min

**Goal:** eliminate the visible fallback→Diatype swap. Font is currently fetched dead-last
(798 ms) because it's off the critical path.

**Change** — `app/layout.tsx:30`:

```diff
 const diatypeSans = localFont({
   src: [{ path: "../public/fonts/diatype/core/ABCDiatype-Regular-Trial.woff2", weight: "400", style: "normal" }],
   variable: "--font-diatype-sans",
-  display: "swap",
-  preload: false,
+  display: "optional",
+  preload: true,
 })
```

**Measure:** DevTools → Network → the woff2 request start time should drop from ~798 ms to
**< 300 ms**. Screen-record 3 cold loads (disable cache) → **no font change** should be visible.

**✅ KEEP if:** no visible swap across 3 recordings, and font requests before FCP.
**↩ REVERT / adjust if:** the brand requires Diatype to _always_ render (with `optional`, slow
connections may keep the fallback for that load) → use `display: "swap"` + `preload: true`
instead (keeps the preload win, shrinks the flash to near-zero instead of removing it).
**Do NOT revert on a flat Lighthouse score** — this is a _perceived-quality_ fix; it won't move
the number. Validate it visually.

**Watch:** CLS must stay 0 (the metric-matched fallback already guarantees this).

---

## Commit 2 — Lazy-load Sentry Session Replay · P2 · confidence HIGH · ~30 min

**Goal:** remove the Replay bundle + init from every page load. It ships and initializes even
though session sampling is 0 (the sample rate governs _recording_, not whether the code loads).
Prime suspect for the 60 KB-unused chunk on `/`.

**Change** — `instrumentation-client.ts:11`:

```diff
 Sentry.init({
   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
-  integrations: [Sentry.replayIntegration()],
+  integrations: [],
   tracesSampleRate: 0.1,
   replaysSessionSampleRate: 0,
   replaysOnErrorSampleRate: 1.0,
 })
```

If you want to keep error-replay, add it lazily on the first error instead of eagerly (e.g.
`Sentry.lazyLoadIntegration("replayIntegration")` inside a one-shot `beforeSend`) — but ship
_that_ as its own follow-up only if C2's byte win is confirmed first.

**Measure (deterministic):** `npm run build` before and after → compare **First Load JS for `/`**
in the route table. Cross-check with the lighthouse `unused-javascript` audit.

**✅ KEEP if:** `/` First Load JS drops by a meaningful amount (target ≥ ~40 KB — the replay
bundle).
**↩ REVERT if:** delta is < ~10 KB — that would prove Replay wasn't actually in the `/` entry
and the change buys nothing here. (Measured, not assumed.)

**Watch:** trigger a client-side error and confirm Sentry still captures it — error reporting is
independent of the Replay integration.

---

## Commit 3 — Cache the SSR price fetch (unblock TTFB) · P3 · confidence MED · ~30 min

**Goal:** stop every request from awaiting a live oracle fetch before render.
`app/layout.tsx:124` awaits `loadServerTokenPrices()` on every request.

**Change** — `app/lib/prices/server-hydrate.ts`, wrap the fetch so it's served from cache and
revalidated in the background rather than blocking each render:

```ts
import { unstable_cache } from "next/cache"
// prices don't need per-request freshness; a 60s window is plenty
const getCachedTokenPrices = unstable_cache(fetchTokenPrices, ["server-token-prices"], { revalidate: 60 })
// ...use getCachedTokenPrices() inside loadServerTokenPrices()
```

**Measure (needs Vercel preview):** run the `time_starttransfer` curl loop (×5) against the
preview before and after.

**✅ KEEP if:** median cold TTFB drops (target 510 ms → < 300 ms).
**↩ REVERT if:** flat — the oracle fetch wasn't the TTFB bottleneck; don't keep complexity that
bought nothing.

**Note:** this does **not** restore CDN caching or bf-cache (the page is still dynamic because
of the per-request CSP nonce). That's C3b — only attempt it if TTFB is still a problem after C3.

---

## Commit 3b — Restore CDN cache + bf-cache (optional, bigger) · confidence MED · risk MED

**Goal:** the HTML is served `no-store` (never CDN-cached; `x-vercel-cache: MISS`) and bf-cache
is disabled, because reading `headers()` in the root layout forces dynamic rendering. Removing
that dependency lets the shell be cacheable.

**Change:** move the CSP-nonce consumption out of the root layout's render path (the nonce is
set in `proxy.ts` and only used for the inline theme script) so the layout no longer calls
`await headers()`, allowing static/ISR rendering of the shell.

**Measure (Vercel preview):** `curl -sI` → `cache-control` should lose `no-store`;
`x-vercel-cache` should become `HIT` on the second request; Lighthouse bf-cache audit passes.

**✅ KEEP if:** `no-store` is gone AND repeat-visit TTFB drops to CDN levels.
**↩ REVERT if:** it breaks the CSP nonce / inline theme script (check for CSP console errors and
a theme flash). Only ship if both the cache win lands and CSP stays intact.

**Gate:** don't start C3b unless C0/C3 show TTFB or repeat-nav is still hurting.

---

## Commit 4 — Server-render the above-the-fold hero (the real LCP lever) · P1 · confidence MED · risk HIGH

**Goal:** the landing content is client-only (`app/components/home-page-client.tsx:8`,
`dynamic(ssr:false)`) + gated by `SandboxGate`'s `useHydrated`, so SSR ships only the word
"Avana" and LCP waits for ~425 KB of JS to hydrate. This is the 1.0 s→2.8 s FCP→LCP gap and the
single biggest LCP win.

**Change (pick one, smallest first):**

- (a) Render a real above-the-fold hero/skeleton **server-side** (static markup with the real
  heading + layout), and hydrate the interactive workspace card into it, instead of the
  `ssr:false` skeleton.
- (b) Use an auth-hint cookie so the server can render the correct surface (onboarding vs.
  workspace) without waiting for client hydration — this is what the `useHydrated` guard is
  working around.

**Measure:** median LCP (×5) on the real build/preview, **and** `curl -s <url> | grep "Welcome
to the Avana"` — the hero copy should now be present in the SSR HTML.

**✅ KEEP if:** median LCP drops ≥ 0.5 s **and** the hero text is in the SSR HTML **and** no
onboarding flash for signed-in users.
**↩ REVERT if:** LCP is flat → the hero wasn't the LCP element after all. Re-identify the LCP
node (Lighthouse "Largest Contentful Paint element" audit) before attempting again — do not
guess a second time.

**Watch:** the `useHydrated` guard exists to stop signed-in users briefly seeing the onboarding
wall. Manually QA: sign in, hard-reload `/`, confirm no onboarding flash.

---

## Commit 5 — A/B the inline-CSS experiment (only if FCP still misses target) · conditional

**Goal:** `experimental.inlineCss: true` (`next.config.mjs:56`) inlines 126 KB of CSS into every
HTML response (re-sent + re-parsed each navigation). It helps first paint but bloats payload.
**Genuinely uncertain** — which is exactly why it's measured, not assumed.

**Change** — `next.config.mjs:56`: `inlineCss: true` → `false`.

**Measure:** FCP median (×5) + HTML document size + a repeat-navigation timing, before/after.

**✅ KEEP the change (inline off) if:** FCP holds or improves **and** payload/repeat-nav drops.
**↩ KEEP inline on (revert) if:** FCP regresses. Let the number decide.

**Gate:** only run this if C1–C4 leave FCP above your target. Don't touch a working knob blind.

---

## Commit 6 — Drop the wasted guest `convex/react` fetch (cleanup) · low priority

For a guest on `/`, `app/lib/prices/token-prices-context.tsx:36` `React.lazy`-imports the Convex
prices module, which then throws (no `ConvexProvider` mounted) and falls back. A pointless chunk
fetch. Gate it behind `hasConvexClient && isSignedIn`/route so it never loads on the guest
landing. **Measure:** network panel on `/` shows one fewer chunk request. Minor; do last.

---

## Order & rationale

```
C0 baseline ─► C1 font ─► C2 sentry ─► C3 price-cache ─► C4 SSR hero ─► (C3b / C5 / C6 as gated)
   (measure)   (visual)   (bytes)      (TTFB)            (LCP)
   quick, high-confidence, low-risk  ───────────────►  slow, high-payoff, high-risk
```

- **C1, C2 first:** highest confidence, lowest risk, fastest to measure — bank the certain wins
  and confirm the harness works before spending effort on the hard ones.
- **C3 before C4:** cheap TTFB check; informs whether C3b is even needed.
- **C4 last of the "sure" set:** biggest LCP lever but riskiest (touches the hydration-flash
  guard) — do it once the cheap wins are locked in.
- **C3b / C5 / C6 are gated** — only touch them if earlier measurements say there's still a gap.
  Changing a working knob without a measured gap is the anti-pattern this runbook exists to
  prevent.

## Definition of done (per commit)

1. The measurement was taken **before and after**, using the real-build method (not audit mode).
2. The result is written next to the baseline row.
3. The change beat its gate → **keep**; or was flat/negative → **revert** and note why.
4. Never carry an unmeasured change into the next commit.
