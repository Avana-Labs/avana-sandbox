# Ask AI production configuration

Ask AI runs generation, durable streams, tools, RAG, quotas, attachments, transcription, telemetry, and feedback in Convex. The browser never calls OpenAI or a market provider directly.

## Required secrets

Set these on the Convex deployment, not in `NEXT_PUBLIC_*` variables:

```sh
npx convex env set OPENAI_API_KEY
npx convex env set COINGECKO_API_KEY
```

`OPENAI_API_KEY` powers GPT-5.6 Luna, `text-embedding-3-small`, and `gpt-4o-mini-transcribe`. `COINGECKO_API_KEY` is optional when the selected CoinGecko tier permits unauthenticated requests, but production should provide it.

The model is deliberately fixed by code to `gpt-5.6-luna`; users do not see or select a model. `ASK_AI_MODEL` is an operator-only emergency override and should normally remain unset.

## Market ingestion

The conversation path reads only normalized Convex records. Provider access happens in isolated Convex cron actions and never blocks a chat turn.

DefiLlama prices are already ingested by the canonical `prices.refreshPrices` job. Ask AI copies those existing `tokenPrices`, `markets`, and `lendMarkets` records into its normalized cache rather than contacting DefiLlama from a conversation.

CoinGecko, Uniswap, Curve, Balancer, and Aave data must first be added to the app's canonical Convex ingestion layer. Ask AI must not operate a second provider-ingestion schedule. Answers receive only canonical records inside their configured freshness window; missing or stale records are not passed to Luna as live facts.

## First deployment

Deploy the Convex schema and functions before enabling the new frontend:

```sh
npx convex deploy
npx convex run askAIRag:ingestCorpus '{}'
```

The corpus contains the Avana whitepaper, developer documentation, and FAQ. Ingestion uses document content hashes, bounded chunks, and `text-embedding-3-small`; unchanged scheduled runs do not re-embed the corpus.

After deployment, run the live and browser acceptance gates:

```sh
RUN_ASK_AI_LIVE_EVALS=1 npm run test:ask-ai:live
RUN_ASK_AI_CONVEX_E2E=1 PLAYWRIGHT_PORT=3010 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npx playwright test tests/e2e/ask-ai.spec.ts --project=chromium
```

## Operational checks

- Confirm every market provider has a recent successful `askAIMarketProviderRuns` record.
- Confirm `askAITelemetry` captures successful and failed turns with latency, token usage, and tool selection.
- Review `askAIFeedback` through `askAI:feedbackReport` using an internal/admin surface.
- Alert on stale canonical prices, failed ingestion jobs, model failures, token-budget exhaustion, and elevated negative feedback.
- Keep guest access enabled for iteration. The durable HttpOnly guest cookie prevents session-storage resets from creating a new quota identity; the global Convex limit remains the abuse ceiling.
