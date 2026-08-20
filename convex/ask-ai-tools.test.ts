// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const WALLET_A = "0x00000000000000000000000000000000000000aa"
const WALLET_B = "0x00000000000000000000000000000000000000bb"

async function seedPosition(t: ReturnType<typeof convexTest>, wallet: string, marketSlug: string) {
  return await t.run(async (ctx) =>
    ctx.db.insert("positions", {
      wallet,
      product: "multiply",
      marketSlug,
      assetId: "ETH",
      status: "open",
      collateralValueUsd: 10_000,
      debtValueUsd: 3_500,
      ltv: 0.35,
      healthFactor: 1.857,
      openedAt: 1,
      lastUpdatedAt: 2,
    }),
  )
}

describe("Ask AI authenticated portfolio tools", () => {
  test("returns a wallet-required result for a guest", async () => {
    const t = convexTest(schema, modules)
    await expect(t.withIdentity({ subject: "ask-guest:test" }).query(api.askAITools.borrowCapacity, {})).resolves.toMatchObject({
      walletRequired: true,
    })
  })

  test("does not expose another wallet's position", async () => {
    const t = convexTest(schema, modules)
    const ownId = await seedPosition(t, WALLET_A, "eth-usdc")
    const otherId = await seedPosition(t, WALLET_B, "wbtc-usdc")
    const asA = t.withIdentity({ subject: WALLET_A })

    await expect(asA.query(api.askAITools.positionRisk, { positionId: ownId })).resolves.toMatchObject({
      wallet: WALLET_A,
      positions: [expect.objectContaining({ marketSlug: "eth-usdc" })],
    })
    await expect(asA.query(api.askAITools.positionRisk, { positionId: otherId })).rejects.toThrow("Position not found")
  })
})
