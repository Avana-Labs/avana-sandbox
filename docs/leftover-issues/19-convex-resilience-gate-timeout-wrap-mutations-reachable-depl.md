# Convex resilience: gate timeout, wrap mutations, reachable deployment

**Priority:** MEDIUM · **Area:** infra

**Problem:** Console spams "Attempting reconnect / WebSocket closed 1006" (Convex client → unreachable `127.0.0.1:3210`). When Convex is configured-but-down, `AuthedGate` (`app/components/sandbox/sandbox-gate.tsx:~55`) shows a forever "Verifying…" spinner (no timeout, no offline copy). Session-provider mutations (`app/lib/avana-session/avana-sessions-provider.tsx:~357`) have no try/catch.

**Fix:** Point at a reachable deployment; add a gate timeout → offline state; wrap persist mutations in try/catch with surfaced errors.
