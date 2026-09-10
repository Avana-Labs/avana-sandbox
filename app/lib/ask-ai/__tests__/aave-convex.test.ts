// @vitest-environment edge-runtime
import { register as registerAgent } from "@convex-dev/agent/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import schema from "../../../../convex/schema"
import { api, internal } from "../../../../convex/_generated/api"
import { aaveApyVisual } from "../aave-mcp"

const modules = import.meta.glob("../../../../convex/**/*.*s")
function setup() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  registerRateLimiter(t)
  return t
}

describe("Aave Convex integration", () => {
  it("binds personal reads to the queued identity and rejects a non-running turn", async () => {
    const t = setup()
    const wallet = "0x1111111111111111111111111111111111111111"
    const owner = t.withIdentity({ subject: wallet, wallet })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.enqueueTurn, {
      threadId: thread.threadId,
      prompt: "My Aave positions for 0x2222222222222222222222222222222222222222",
      clientRequestId: "aave-wallet",
    })
    await expect(t.query(internal.askAITools.aaveWalletForTurn, { turnId: turn.turnId })).rejects.toThrow("not running")
    // enqueueTurn stamps the wallet from the authed identity. Drive the running
    // state directly instead of claimQueuedTurn so the read doesn't race the
    // scheduled generateTurn (which would claim and fail the turn under test).
    await t.run((ctx) => ctx.db.patch(turn.turnId, { status: "running" }))
    expect(await t.query(internal.askAITools.aaveWalletForTurn, { turnId: turn.turnId })).toBe(wallet)
  })

  it("persists APY timestamps and the new Aave financial kinds, then reloads them", async () => {
    const t = setup()
    const owner = t.withIdentity({ subject: "ask-guest:aave-chart" })
    const thread = await owner.mutation(api.askAI.create, {})
    const turn = await owner.mutation(api.askAI.enqueueTurn, {
      threadId: thread.threadId,
      prompt: "Aave USDC APY chart",
      clientRequestId: "aave-chart",
    })
    await t.mutation(internal.askAI.claimQueuedTurn, { turnId: turn.turnId })
    const visual = aaveApyVisual(
      [
        { date: "2026-09-09", apyPct: "3" },
        { date: "2026-09-10", apyPct: "4" },
      ],
      "Aave USDC",
      "supply",
      "week",
    )!
    await t.mutation(internal.askAI.completeGeneratedTurn, {
      turnId: turn.turnId,
      assistantMessageId: "aave-chart-result",
      model: "test",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      richParts: { visual, financialResults: [{ kind: "aave_governance", payload: { data: { proposalId: "516" } } }] },
    })
    const parts = await t.run((ctx) =>
      ctx.db
        .query("askAIMessageParts")
        .withIndex("by_message", (q) => q.eq("messageId", "aave-chart-result"))
        .unique(),
    )
    expect(parts?.parts).toMatchObject({
      visual: { kind: "aave_apy", points: [3, 4], timestamps: visual.timestamps },
      financialResults: [{ kind: "aave_governance" }],
    })
  })

  it("records HTTP 429 cooldown and preserves the last successful snapshots", async () => {
    const t = setup()
    const now = Date.now()
    await t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
      records: [
        {
          source: "aave",
          kind: "lending_market",
          key: "v3:1:USDC",
          fetchedAt: now,
          payload: { symbol: "USDC", supplyApyPct: 3 },
        },
      ],
    })
    await t.mutation(internal.askAIIngestion.recordProviderRun, {
      source: "aave",
      status: "failed",
      records: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      error: "Aave MCP rate limited (429)",
      httpStatus: 429,
      retryAt: now + 120000,
      startedAt: now,
      completedAt: now,
    })
    expect(await t.query(internal.askAIIngestion.providerCooldown, { source: "aave" })).toBe(now + 120000)
    const rows = await t.run((ctx) => ctx.db.query("askAIMarketSnapshots").collect())
    expect(rows).toHaveLength(1)
    expect(rows[0].payload.supplyApyPct).toBe(3)
  })

  it("keeps explicit Avana catalog queries separate from cached Aave v4 markets", async () => {
    const t = setup()
    await t.mutation(internal.askAIIngestion.upsertRecordsMutation, {
      records: [
        {
          source: "aave",
          kind: "lending_market",
          key: "v4:1:USDC",
          fetchedAt: Date.now(),
          payload: { symbol: "USDC", market: "Aave v4 Ethereum", supplyApyPct: 3 },
        },
      ],
    })
    const avana = await t.query(api.askAITools.searchMarkets, { query: "Avana USDC markets" })
    expect(avana.providerData).toEqual([])
    const aave = await t.query(api.askAITools.searchMarkets, { query: "Aave v4 USDC markets" })
    expect(aave.markets).toEqual([])
    expect(aave.providerData[0]).toMatchObject({ source: "aave", data: { supplyApyPct: 3 } })
  })
})
