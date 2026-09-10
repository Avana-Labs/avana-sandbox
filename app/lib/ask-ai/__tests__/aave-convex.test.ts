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
    // enqueueTurn stamps the wallet from the authenticated identity, never from
    // the address in the prompt. Read the row rather than querying through the
    // status gate, which the scheduled generateTurn is concurrently advancing.
    expect(await t.run((ctx) => ctx.db.get(turn.turnId))).toMatchObject({ wallet })

    // Assert the status gate on rows this test owns, so no scheduled work can
    // move a turn between the patch and the read.
    const gateTurn = (status: "queued" | "running") =>
      t.run((ctx) =>
        ctx.db.insert("askAITurns", {
          threadId: thread.threadId,
          ownerSubject: wallet,
          clientRequestId: `gate-${status}`,
          promptMessageId: `gate-message-${status}`,
          prompt: "My Aave positions",
          wallet,
          status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )
    await expect(t.query(internal.askAITools.aaveWalletForTurn, { turnId: await gateTurn("queued") })).rejects.toThrow(
      "not running",
    )
    expect(await t.query(internal.askAITools.aaveWalletForTurn, { turnId: await gateTurn("running") })).toBe(wallet)
  })

  it("nets debt out of portfolio value and leaves Umbrella out of Net Value", async () => {
    const t = setup()
    const wallet = "0x3333333333333333333333333333333333333333"
    const owner = t.withIdentity({ subject: wallet, wallet })
    const now = Date.now()
    await t.run(async (ctx) => {
      // These tables store debt as a POSITIVE valueUsd tagged `state: "debt"`.
      await ctx.db.insert("walletMultiplyBalances", {
        wallet,
        assetId: "weth",
        symbol: "WETH",
        amount: 1,
        valueUsd: 1_000,
        state: "collateral",
        updatedAt: now,
      })
      await ctx.db.insert("walletMultiplyBalances", {
        wallet,
        assetId: "usdc",
        symbol: "USDC",
        amount: 600,
        valueUsd: 600,
        state: "debt",
        updatedAt: now,
      })
      await ctx.db.insert("walletLiquidBalances", {
        wallet,
        assetId: "usdc",
        symbol: "USDC",
        amount: 250,
        valueUsd: 250,
        state: "available",
        updatedAt: now,
      })
      await ctx.db.insert("positions", {
        wallet,
        product: "umbrella",
        marketSlug: "umbrella-gho",
        status: "open",
        suppliedUsd6: "5000000000",
        openedAt: now,
        lastUpdatedAt: now,
      })
    })
    const portfolio = await owner.query(api.askAITools.portfolio, {})
    if (portfolio.walletRequired) throw new Error("expected an authenticated portfolio read")
    // Gross exposure still counts the debt row, for callers that want size.
    expect(portfolio.totals.multiplyUsd).toBe(1_600)
    // Equity subtracts it.
    expect(portfolio.totals.multiplyNetUsd).toBe(400)
    // Net Value = liquid + lend + borrow + multiply, debt negative, and it must
    // NOT absorb the $5,000 Umbrella deposit.
    expect(portfolio.totals.netValueUsd).toBe(650)
    expect(portfolio.totals.umbrellaUsd).toBe(5_000)
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
