// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"
const MARKET = "uni-v3-bluechip-weth-usdc"

describe("borrow product balances", () => {
  test("syncs pledged collateral rows from the absolute position value", async () => {
    const t = convexTest(schema, modules)
    const wallet = WALLET.toLowerCase()
    await t.run(async (ctx) => {
      await ctx.db.insert("walletBorrowBalances", {
        wallet,
        marketId: MARKET,
        poolId: "eth-usdc-lp",
        symbol: "ETH / USDC LP",
        amount: 0,
        valueUsd: 0,
        state: "poolAvailable",
        updatedAt: Date.now(),
      })
      await ctx.db.insert("walletBorrowBalances", {
        wallet,
        marketId: MARKET,
        poolId: "eth-usdc-lp",
        symbol: "ETH / USDC LP",
        amount: 6.4,
        valueUsd: 800,
        state: "collateral",
        updatedAt: Date.now(),
      })
    })

    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.transactions.recordTransaction, {
      wallet: WALLET,
      intentId: "sync-product-collateral",
      product: "borrow",
      kind: "withdraw",
      marketSlug: MARKET,
      requestedAmountUsd6: "501000000",
      executedAmountUsd6: "501000000",
      amountUsd: 501,
      simulated: true,
      position: {
        status: "open",
        marketSlug: MARKET,
        collateralValueUsd6: "299000000",
        debtValueUsd6: "0",
        collateral: [
          {
            marketSlug: MARKET,
            collateralShares: "299000000",
            principalTokenAmount: "299000000",
            collateralEnabled: true,
            collateralValueUsd6: "299000000",
          },
        ],
        debt: [],
      },
    })

    const balances = await asUser.query(api.wallet.productBalances.listForWallet, { wallet: WALLET })
    const rows = balances.borrow.filter((row) => row.marketId === MARKET)
    expect(rows.find((row) => row.state === "collateral")?.valueUsd).toBe(299)
    expect(rows.find((row) => row.state === "poolAvailable")?.valueUsd).toBe(501)
  })
})
