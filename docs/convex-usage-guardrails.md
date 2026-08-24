# Convex usage guardrails

These commands are operator-run safeguards. Review the selected deployment before applying them; repository tests and builds must never change remote usage limits.

## Personal cloud development deployment

Inspect the current limits first:

```sh
npx convex deployment usage-limits list --deployment dev --json
```

Recommended daily warnings:

```sh
npx convex deployment usage-limits set --deployment dev --metric databaseIoGb --window day --type warning --limit 0.025
npx convex deployment usage-limits set --deployment dev --metric functionCalls --window day --type warning --limit 10000
```

Recommended daily disable thresholds:

```sh
npx convex deployment usage-limits set --deployment dev --metric databaseIoGb --window day --type disable --limit 0.1
npx convex deployment usage-limits set --deployment dev --metric functionCalls --window day --type disable --limit 50000
```

The limits apply only to the selected deployment. Use a local Convex deployment for routine development where possible; local function calls and database I/O do not consume cloud plan quotas.

## Production

Do not copy the development thresholds to production. First export at least seven days of normal production usage, calculate daily p95 and peak usage, and set warnings above p95. A production disable threshold requires explicit approval because exceeding it pauses the deployment.

Never add `--prod` to the commands above without reviewing the resolved project, production traffic baseline, and rollback procedure.
