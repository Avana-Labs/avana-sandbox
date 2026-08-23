# Ask AI — Remaining Work & Backlog

Handoff snapshot for the `feature/ask-ai` branch. Context: the Convex backend (providers, crons,
RAG, token budget) is **deployed to prod** (`resolute-eel-426`); the **frontend changes are committed
but only live on the local dev server** until `feature/ask-ai` is pushed and Vercel builds. See
`docs/ask-ai-lane-contracts.md` for the richParts/error contract, and the `ask-ai-audit-2026-08-20`
memory for the deeper audit.

---

## P0 — Operator / deploy (needs a human; do first)

- [ ] **Rotate the OpenAI key.** The live `sk-proj-…` key was printed into an assistant session log
      during this work. Generate a new key in the OpenAI dashboard and update the Convex env var
      `OPENAI_API_KEY`.
- [ ] **Push `feature/ask-ai` → Vercel.** All the UI work (markdown, thinking indicator, skeleton,
      send button, header subject, voice/attach removal) is committed but the deployed Vercel app
      still runs the old frontend until a push + build. (Convex functions are already deployed.)
- [ ] **Confirm the market-ingestion crons actually fire in prod.** `crons.ts` schedules
      `ask ai ingest defillama pools` and `ask ai ingest aave markets`. Verify the first runs landed
      (rows in `askAIMarketProviderRuns`, fresh `askAIMarketSnapshots`). Manual seed used so far:
      `npx convex run askAIIngestion:ingest '{"source":"defillama"}'` → 253 records;
      `'{"source":"aave"}'` → 91.
- [ ] **RAG is ingested** (3 sources / ~488 chunks, version `9f4edd6c…`). If the corpus changes,
      re-run `internal.askAIRag.ingestCorpusIfVersionChanged` with the new version.

## P1 — Known issues not yet fixed

- [ ] **App-wide hydration warning.** Fires on every route (confirmed on `/`, not just `/ask`).
      Comes from the **root layout provider stack** in `app/layout.tsx` (ThemeProvider / WalletGate /
      SandboxGate / CurrencyDisplay / ConditionalSiteChrome). The Ask-AI-specific causes are already
      fixed (thread is client-only via `useHydrated`; the `FileImageIcon` SSR + `[@media]` mismatches
      are gone). Needs a dedicated pass: reproduce with the Next dev overlay, read the exact
      server-vs-client diff, and guard the offending provider. React recovers, so it's a warning, not
      a crash — but it should be eliminated. **Do not patch blind** (risks the whole shell).
- [ ] **`/ask` close (X) feels like a full reload.** It's a client `router.push("/")`, not a true
      reload — the home page is heavy (~3.4MB first-load JS, see the `mobile-perf-diagnosis` memory),
      so mounting it is slow. Fix belongs to home-page perf (defer the wallet/wagmi stack), not the
      close handler.
- [ ] **Verify in a real browser** (automation can't drive the assistant-ui composer or the mic):
      streaming feel (smooth token reveal + markdown, no resize jump), thinking indicator animating
      with elapsed time, long answers with tables/code, and the reopen skeleton (no empty-state flash).

## P2 — Ask AI backend correctness / cleanup

- [ ] **Domain/safety gate is advisory only.** `beginTurn` computes `domain` (or trusts a
      client-supplied `routing` object) but never blocks — an `unsupported` turn still reaches the
      model. Decide whether to hard-block server-side or keep model-enforced redirection.
- [ ] **Enforce citations in code.** Protocol answers are told (prompt-only) to cite a RAG source;
      nothing rejects/regenerates an answer that called no `search_avana_knowledge` or returned none.
- [ ] **Orphaned voice/attachment backend.** The UI for voice + attachments was removed, but
      `convex/askAIVoice.ts` and the attachment functions/tables in `convex/askAIAttachments.ts`
      remain. Decide: keep for a future re-add, or delete the functions + drop the `askAIAttachments`
      table (destructive; needs a coordinated migration). `askAIMediaRateLimiter.ts` is also now
      unused if both go.
- [ ] **`completeTurn` is dead code** (no callers anywhere) — safe to delete.
- [ ] **Stale legacy `curve` rows** (~2,431) linger in prod `askAIMarketSnapshots`; schema validators
      were kept wide to avoid a deploy failure. Optional one-off purge so they stop surfacing to Luna.
- [ ] **CoinGecko / CoinMarketCap:** both keys sit unused in Convex. DefiLlama covers prices + pools.
      Only re-enable CoinGecko (fix the demo-key header: `x-cg-demo-api-key`, not `x-cg-pro-api-key`)
      or wire a `CoinMarketCapProvider` if you specifically want their data — CMC Basic likely needs a
      "Powered by CoinMarketCap" attribution, so confirm before shipping.
- [ ] **Normalized market schema.** Aave and DefiLlama-pool payloads are now shaped, but snapshots are
      still stored as `v.any()`. Formalize a canonical market record + a provider-health table
      (last attempt/success, source timestamp, record count, latency, error, freshness).

## P2 — Security hardening backlog (from the security audit)

- [ ] **Guest quota is bypassable.** Lane E added a best-effort per-IP throttle on `/api/ask-ai/session`,
      but it's in-memory (per serverless instance). Move to a shared store (Convex-backed counter) for
      a real limit; also consider keying the per-subject quota to a stable device signal.
- [ ] **Prompt-injection hardening.** `web_search` results (and any future attachment/file content)
      are inserted as authoritative context with no instruction-stripping. Treat external content as
      delimited data; add an injection note to the system prompt.
- [ ] **Alerting/observability:** stale prices, provider failures, RAG emptiness, unusual token
      consumption, repeated tool failures. Store safe public error codes on failed turns.

## P2 — Testing gaps

- [ ] **Live-model evals not in CI.** Lane G added the `ask-ai-live-evals` job; it needs the
      `OPENAI_API_KEY` **repo secret** to actually run (skips harmlessly without it). Add it.
- [ ] **No deterministic tests** for: streaming persistence / no-duplicate on refresh, numeric
      prose-vs-tool consistency, oversized (>10MB) attachment rejection (needs e2e — convex-test's
      storage stub can't exercise it).
- [ ] **No component tests** for the new loading skeleton, thinking indicator, or the header-subject
      behavior (blank → "Ask AI", thread → subject, persists on reopen).

## P3 — Product / UX polish

- [ ] **"Show thoughts" reasoning.** The thinking indicator says a generic "Thinking…". Wire the
      current tool name into it ("Searching Avana knowledge…", "Reading your positions…") by reading
      the running step, for a more informative live status.
- [ ] **Prior-session failed-turn retry** is only partial (transient turns retry; persisted failed
      turns show an error card without a working retry).
- [ ] **Mobile re-check** at 390px: composer fit, skeleton, sidebar overlay, header truncation.
- [ ] **Delete-thread** does not exist (archive only) — add if product wants it.

## Areas worth a broader look (beyond Ask AI)

- App-wide hydration (above) affects every route.
- Mobile first-load JS ~3.4MB (wallet SDK on the critical path) — the biggest perf lever, and the
  reason `/ask` close feels heavy.
- Turbopack dev cache: the launch config keeps `.next-dev` across restarts, which repeatedly served
  stale chunks during this work. A full `rm -rf .next-dev .next node_modules/.cache` + restart is the
  reliable reset when the dev server shows errors that reference deleted code. (Prod `next build` is
  unaffected.)

---

## What was completed on this branch (for reference)

Providers reworked (DefiLlama = prices + pools; Aave = public keyless v3 API; Uniswap/CoinGecko/
Balancer/Curve removed from the live set); staggered ingestion crons + attachment-purge cron; RAG
ingested; token budget 30k→500k; typed tool selection; `dataProvenance:"sandbox"` on financial tools;
error sanitization to `ConvexError{code,message}`; failed-turn hygiene; mutation lockdown
(complete/fail turns → internal); rich-card pipeline wired end-to-end (financialResults +
retrievalChunks + per-kind reshaping adapter); markdown via assistant-ui `MarkdownText` (streams
smoothly); assistant-ui `thinking-indicator`; animated loading skeleton; voice + attachment UI/code
deleted; send button restyled + right-aligned; Avana placeholder; thread subject in the app-shell
header; mobile-only sidebar collapse; client-only thread render; regression tests (authz, error
contract, attachment MIME, provenance) + live-eval CI job; `.env.example` + `.prettierignore` cleanup.
