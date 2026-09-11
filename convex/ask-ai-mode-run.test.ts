// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const WALLET_A = "0x00000000000000000000000000000000000000aa"
const WALLET_B = "0x00000000000000000000000000000000000000bb"

async function seed(t: ReturnType<typeof convexTest>, wallet: string) {
  return t.run(async (ctx) => {
    const positionId = await ctx.db.insert("positions", {
      wallet,
      product: "multiply",
      marketSlug: "eth-usdc",
      assetId: "ETH",
      status: "open",
      collateralValueUsd: 10_000,
      debtValueUsd: 3_500,
      openedAt: 1,
      lastUpdatedAt: 2,
    })
    await ctx.db.insert("markets", {
      scope: "multiply",
      slug: "eth-usdc",
      chainId: 1,
      name: "ETH / USDC",
      symbol: "ETH/USDC",
      maxLtvPct: 55,
      constituents: [
        { symbol: "ETH", weight: 0.5 },
        { symbol: "USDC", weight: 0.5 },
      ],
      createdAt: 1,
    })
    await ctx.db.insert("multiplyTokenParameters", {
      symbol: "ETH",
      supplyApyPct: 3,
      borrowAprPct: 5,
      availableUsd: 1_000_000,
      collateralFactorPct: 55,
      liquidationThresholdPct: 65,
      iconUrl: "/eth.svg",
      updatedAt: 1,
    })
    return positionId
  })
}

describe("buildModeRun", () => {
  test("assembles a risk run off the owner's live position", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seed(t, WALLET_A)
    const result = await t
      .withIdentity({ subject: WALLET_A })
      .query(api.askAiModeRun.buildModeRun, { mode: "risk", queryText: "am I safe?", positionId })
    expect(result).toMatchObject({ walletRequired: false, rerouted: false })
    if (result.walletRequired === false) {
      expect(result.run.mode).toBe("risk")
      expect(result.run.widgets.map((w) => w.type)).toContain("risk_summary")
      expect(result.run.snapshotId).toMatch(/^snap_/)
    }
  })

  test("reroutes a leverage question asked in Returns mode to Risk", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seed(t, WALLET_A)
    const result = await t
      .withIdentity({ subject: WALLET_A })
      .query(api.askAiModeRun.buildModeRun, { mode: "returns", queryText: "should I loop this?", positionId })
    expect(result).toMatchObject({ walletRequired: false, rerouted: true })
    if (result.walletRequired === false) expect(result.run.mode).toBe("risk")
  })

  test("returns wallet-required for a guest", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seed(t, WALLET_A)
    await expect(
      t
        .withIdentity({ subject: "ask-guest:test" })
        .query(api.askAiModeRun.buildModeRun, { mode: "risk", queryText: "hi", positionId }),
    ).resolves.toMatchObject({ walletRequired: true })
  })

  test("does not expose another wallet's position", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seed(t, WALLET_A)
    await expect(
      t
        .withIdentity({ subject: WALLET_B })
        .query(api.askAiModeRun.buildModeRun, { mode: "risk", queryText: "hi", positionId }),
    ).rejects.toThrow("Position not found")
  })
})
