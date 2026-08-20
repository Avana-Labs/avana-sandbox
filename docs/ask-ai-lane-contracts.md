# Ask AI remediation — shared contracts (PREP)

Agreed shapes so Lanes B (server turn lifecycle), C (chat UI), and D (tool provenance) can build
in parallel without waiting on each other. Anything not fixed here is the owning lane's choice.

## 1. `richParts` (persisted by `completeGeneratedTurn`, rendered by the UI)

Today the server persists only `{ sources, usage }`. Extend to:

```ts
type AskAIRichParts = {
  // Already produced (from search_avana_knowledge tool output). Keep as-is.
  sources: Array<{
    domain: string
    title: string
    locator: string
    url?: string
    kind?: string
    version?: string
  }>
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }

  // NEW — Lane B collects these from step tool results and persists them.
  // One entry per financial tool call the model actually made.
  financialResults?: Array<{
    kind: "portfolio" | "borrow_capacity" | "position_risk" | "simulate_borrow" | "stress_position"
    dataProvenance: "sandbox" | "connected_wallet" | "onchain" // supplied by Lane D on the tool result
    payload: unknown // the tool's structured result, verbatim (already numeric-safe)
  }>

  // NEW — Lane B maps search_avana_knowledge entries into this so RetrievalChunks can render.
  retrievalChunks?: Array<{
    title: string
    locator: string
    text: string
    score?: number
  }>
}
```

- **Lane B** owns writing `financialResults` + `retrievalChunks` in `convex/askAIAgent.ts` /
  `convex/askAI.ts::completeGeneratedTurn` (widen its validator from `v.any()` to this shape).
- **Lane C** owns reading them in `app/ask/ask-ai-page-client.tsx` and rendering
  `FinancialResultCard` / `RetrievalChunks` / `ToolCall`. Until Lane B ships, cards stay hidden
  (absent field), never fabricated.
- **Lane D** owns adding `dataProvenance` to each financial tool result in
  `convex/askAITools.ts`; Lane B just passes it through.

## 2. Client-facing error shape

Server actions throw a `ConvexError` whose `data` is user-safe; detailed text stays in telemetry.

```ts
throw new ConvexError({
  code: "ASK_AI_GENERATION_FAILED" | "ASK_AI_ATTACHMENT_FAILED" | "ASK_AI_RATE_LIMITED" | "ASK_AI_UNAVAILABLE",
  message: string, // short, friendly, no function names / request ids / stack
})
```

- **Lane B** owns throwing this from `generateTurn` (and mapping provider/rate-limit failures to a
  code) while still recording the raw error in `askAITelemetry`.
- **Lane C** owns rendering `error.data.message` in `ErrorState` (never `String(error)`), with a
  `code`→copy fallback map; and must **not** show feedback/copy controls on a failed or
  empty-content assistant message.

## 3. Failed-turn message hygiene (Lane B)

On failure, `failTurn` must ensure no partial/empty assistant message is left rendered as
`complete` (delete it or mark it failed) so Lane C never shows Copy/👍/👎 next to the error card.
