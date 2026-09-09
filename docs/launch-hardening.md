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
