# Launch hardening implementation

This change series implements the 14 security, cost, and maintainability findings from the September 9 QA audit on PR #283. Each item is a separate commit. Service configuration changes and measured production savings require deployment follow-up; no production data is seeded by these changes.

| Item | Scope                                               | Validation                                                                                        |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| S1   | Update Next.js/Sharp/Browserslist security baseline | 36 focused tests; PNG → resize → WebP passed; zero critical/high production dependency advisories |

The remaining low/moderate dependency findings include the wallet connector chain. A wagmi major migration is deliberately separate from the patched Next.js image stack.

## S2 — Isolated E2E authentication

Production rejects E2E session minting even with a secret/test flag. Staging requires an explicit deployment marker, distinct production/staging URLs and issuers, and its own private JWK. JWT publication/minting/verification use that staging key consistently. Eight JWT/policy/endpoint tests passed, including cross-key session rejection. Set the documented staging variables only on staging; provision keys outside source control.

The first webpack production build reached Node's default heap limit; final integration must rerun with a bounded larger heap. No production build pass is claimed yet.

## S3 — Development and seed target safety

Dev startup reads the same env files as Next, rejects production/unverified live targets, and isolates mock runs with empty backend credentials and an ephemeral signing key. Set `AVANA_DEPLOYMENT_ENV` and `AVANA_DEVELOPMENT_CONVEX_URL` for real development. Public seed administration is disabled unless the deployment itself is marked development/staging; production maintenance must use reviewed internal functions. Target and seed authorization tests passed; no real credentials were changed and no seed command was run.

## S4 — Dependency baseline gate

A full production-dependency audit runs on every PR, main push, weekly schedule, and manual dispatch. High/critical advisories fail even without dependency changes. Exceptions must identify a package/advisory, justification, and expiry; the checked-in list is empty. Two gate tests and the live baseline passed. Registry failures fail closed.

## C1 — Offline mock catalogs

Mock catalog reads no longer invoke the snapshot fetcher. Live sources still require and merge real snapshots. All 22 provider tests passed, including 100 mock requests with zero external snapshot calls and explicit live-provider failures.

## C2 — Public metadata cache and read deadlines

Editorial content and contract addresses use a bounded 60-second warm-instance cache, deduplicating concurrent reads. Deployment URL and `AVANA_PUBLIC_METADATA_VERSION` isolate cache keys; changing that revision invalidates entries. Risk, wallet, and execution data remain live. Convex server reads cancel their transport after eight seconds. Four tests passed, including 100 concurrent reads producing one fetch, expiry, eviction, failure retry, and caller cancellation. Savings depend on warm-instance reuse; this is not a fleet-wide cache.

## C3 — Separate reactive wallet reads

Balances/positions and the existing 500-row transaction history now subscribe independently, so balance changes do not reread or retransmit history. The combined query remains compatible, wallet authorization applies to both reads, and hydration retains the intent reconciliation guard. All 72 transaction/session tests passed, including combined-versus-split equality and foreign-wallet rejection. History is still bounded to the existing 500 rows; an older-history pagination UI remains follow-up work.

## C4 — Reserve and settle AI usage

Every submission/retry atomically reserves 25,000 tokens before persistence, alongside existing message limits and a global daily allocation ceiling. Completed generations settle to provider usage once; failed streams persist observed usage and retain the unknown portion. Queued cancellations release their reservation, running cancellations/timeouts retain it, and attempt IDs prevent stale completions/failures from changing a retry. Legacy immediate retries now require failed status and pass the same gate. All 31 cost-gate/agent/error tests passed. Reservations are estimates, not provider-dollar limits; configure provider spending limits separately and calibrate allocations using real usage.

## C5 — Request policy and cache accounting

OpenAI requests use standard service by default; `ASK_AI_SERVICE_TIER=fast` explicitly restores the former latency profile. Model, reasoning effort, and financial tool routing remain unchanged. Shared instructions now have an explicit cache breakpoint before per-turn data. Telemetry records cache reads, cache writes, and requested service tier, including observed failed-step usage. Eighteen policy/grounding/telemetry tests and TypeScript passed. No paid evaluations were run and no dollar savings or latency equivalence are claimed. Cache writes also cost tokens; assess read/write metrics after staging validation. Reference: [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

## C6 — Stream and queue write frequency

Stream persistence batches at 250 ms instead of 100 ms. Capacity retries back off from roughly 2.5 seconds to at most 30 seconds, with per-turn jitter and duplicate-wakeup suppression. Queue tests verify blocked work remains queued and starts after capacity returns. This reduces the configured maximum flush frequency from 10 to 4 per second; actual write savings and perceived streaming latency still need staging measurement.

## C7 — Explicit paid evaluation runs

Routine PR/push CI no longer invokes a paid model. The separate manual workflow requires an API key, uses a single worker, standard service, no automatic SDK retries, a 60-second request deadline, and 900 output tokens per step (up to four steps across five fixtures). It archives usage/latency evidence. Ten deterministic evaluations passed and all five paid fixtures skipped locally; workflow parsing confirmed manual-only execution. No OpenAI credits were spent on these checks.

## M1 — Remove unused dashboard panels

Deleted the unused collateral, debt, and trading-fee panel implementations (about 1,000 lines). The dashboard uses the existing supplies/debts tables. Retired source-string assertions against the deleted panels while retaining rendered quick-action routing and active table tests. All 17 focused dashboard tests passed. The interim TypeScript run caught an implicit array type in the new queue test; this was corrected before the integrated checks.

## M2 — Remove obsolete hooks and make unused-file review explicit

Removed four hooks with no runtime consumers, their tests, and the empty legacy dashboard position data/shared presentation files, plus an unused chart-color helper and Framer animation shim. Production transaction/read adapters remain because they define the future chain/indexer boundary and are covered by contract tests. `scripts/unused-app-files.cjs` now understands Next entry conventions, scans tracked and untracked source, and fails on unreviewed test-only consumers; `config/unused-app-files.json` records the intentional adapter/runtime exceptions. The scanner reported 13 reviewed candidates and zero unexpected files. 286 focused tests and TypeScript passed.
