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

  test("reprices collateral LP value at the pool's live price, not the frozen claim USD", async () => {
    const t = convexTest(schema, modules)
    const wallet = WALLET.toLowerCase()
    // Claim: 8 LP @ $125 = $1,000 pledged as collateral. Then the pool's live LP price
    // halves (e.g. a collateral token drops ~50%) → the position must revalue to $500,
    // not stay pinned at the frozen $1,000 that would mask liquidation risk.
    await t.run(async (ctx) => {
      await ctx.db.insert("markets", {
        scope: "pool",
        slug: MARKET,
        chainId: 1,
        name: "ETH / USDC",
        symbol: "ETH / USDC",
        priceUsd: 62.5, // live LP price = half of the $125 claim price
        createdAt: 1,
      })
      await ctx.db.insert("walletBorrowBalances", {
        wallet,
        marketId: MARKET,
        poolId: "eth-usdc-lp",
        symbol: "ETH / USDC LP",
        amount: 8,
        valueUsd: 1000,
        state: "collateral",
        updatedAt: Date.now(),
      })
      await ctx.db.insert("positions", {
        wallet,
        product: "borrow",
        marketSlug: MARKET,
        status: "open",
        collateralValueUsd6: "1000000000",
        debtValueUsd6: "0",
        openedAt: 1,
        lastUpdatedAt: 1,
      })
    })

    const asUser = t.withIdentity({ subject: WALLET })
    const balances = await asUser.query(api.wallet.productBalances.listForWallet, { wallet: WALLET })
    const collateral = balances.borrow.find((row) => row.marketId === MARKET && row.state === "collateral")
    expect(collateral?.valueUsd).toBeCloseTo(500, 6)
    expect(collateral?.amount).toBeCloseTo(8, 6) // units unchanged; only the price moved
  })
})
