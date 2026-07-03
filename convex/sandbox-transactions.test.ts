// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"
import { MAX_TX_PER_HOUR } from "./sandbox/transactions"

// Rooted at the convex directory so convex-test can resolve "sandbox/*".
const modules = import.meta.glob("./**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"
const OTHER = "0xDdD0000000000000000000000000000000000002"

function borrowIntent(intentId: string, overrides: Record<string, unknown> = {}) {
  return {
    wallet: WALLET,
    intentId,
    product: "borrow" as const,
    kind: "borrow",
    marketSlug: "uni-v3-bluechip-weth-usdc",
    assetId: "uni-v2:usdc",
    requestedAmountUsd6: "1000000000",
    executedAmountUsd6: "1000000000",
    amountUsd: 1000,
    simulated: true,
    ...overrides,
  }
}

describe("recordTransaction — ownership, idempotency, rate limit, ledger", () => {
  test("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1"))).rejects.toThrow(
      /UNAUTHENTICATED/,
    )
  })

  test("rejects a wallet that does not match the authed identity", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1", { wallet: OTHER })),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })

  test("writes exactly one transaction row + a position, and the ledger delta", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const res = await asUser.mutation(
      api.sandbox.transactions.recordTransaction,
      borrowIntent("i1", {
        position: {
          status: "open",
          marketSlug: "uni-v3-bluechip-weth-usdc",
          debtValueUsd6: "1000000000",
          collateral: [
            {
              marketSlug: "uni-v3-bluechip-weth-usdc",
              collateralShares: "2000000000",
              principalTokenAmount: "2000000000",
              collateralEnabled: true,
              collateralValueUsd6: "2000000000",
            },
          ],
          debt: [
            {
              assetId: "uni-v2:usdc",
              baseAssetId: "usdc",
              debtSharesUsd6: "1000000000",
              debtIndexRay: "1000000000000000000000000000",
              borrowRateWad: "50000000000000000",
              principalBorrowedUsd6: "1000000000",
            },
          ],
        },
      }),
    )
    expect(res.idempotent).toBe(false)
    expect(res.receipt.status).toBe("success")
    expect(res.receipt.hash).toMatch(/^sim-borrow-borrow-/)

    const activity = await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })
    expect(activity).toHaveLength(1)
    expect(activity[0]?.kind).toBe("borrow")

    const positions = await asUser.query(api.sandbox.transactions.getPositions, { wallet: WALLET })
    expect(positions).toHaveLength(1)
    expect(positions[0]?.product).toBe("borrow")
    expect(positions[0]?.debtValueUsd6).toBe("1000000000")
    expect(positions[0]?.collateral).toHaveLength(1)
    expect(positions[0]?.debt).toHaveLength(1)

    // The aggregate ledger delta is recomputed server-side (there is no client ledger
    // arg), keyed by the borrowed asset, never anything the client could dictate.
    const ledger = await t.query(api.liquidity.listDeltas)
    const row = ledger.find((r) => r.marketSlug === "uni-v2:usdc")
    expect(row?.borrowedDeltaUsd).toBe(1000)

    const portfolio = await asUser.query(api.sandbox.transactions.getPortfolio, { wallet: WALLET })
    expect(portfolio.latest?.totalBorrowedUsd).toBe(1000)
    expect(portfolio.latest?.totalValueUsd).toBe(-1000)
  })

  test("rejects malformed fixed-point position state before writing", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("invalid", {
          position: {
            status: "open",
            marketSlug: "uni-v3-bluechip-weth-usdc",
            debtValueUsd6: "-1",
          },
        }),
      ),
    ).rejects.toThrow(/INVALID_POSITION/)

    expect(await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })).toHaveLength(0)
  })

  test("rejects client amounts that do not match the fixed-point execution", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("invalid-amount", { amountUsd: 50_000 }),
      ),
    ).rejects.toThrow(/INVALID_TRANSITION/)
    expect(await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })).toHaveLength(0)
  })

  test("idempotent on intentId — a replay returns the existing row and does not double-apply", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const first = await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("dup"))
    const second = await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("dup"))
    expect(second.idempotent).toBe(true)
    expect(second.transactionId).toBe(first.transactionId)

    const activity = await asUser.query(api.sandbox.transactions.getActivity, { wallet: WALLET })
    expect(activity).toHaveLength(1)
  })

  test("enforces the hourly per-wallet rate limit", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_TX_PER_HOUR; i++) {
        await ctx.db.insert("transactions", {
          wallet: WALLET.toLowerCase(),
          intentId: `seed-${i}`,
          product: "borrow",
          kind: "borrow",
          status: "success",
          requestedAmountUsd6: "1",
          executedAmountUsd6: "1",
          amountUsd: 1,
          syntheticTxHash: `seed-${i}`,
          simulated: true,
          at: now - 1000,
        })
      }
    })
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("over"))).rejects.toThrow(
      /RATE_LIMITED/,
    )
  })
})

describe("liquidation recording", () => {
  test("records a liquidation gated on the liquidator (acting on a victim it does not own)", async () => {
    const t = convexTest(schema, modules)
    const asLiquidator = t.withIdentity({ subject: OTHER })
    const res = await asLiquidator.mutation(api.sandbox.liquidation.recordLiquidation, {
      wallet: WALLET, // victim
      liquidatorWallet: OTHER,
      repaidUsd6: "500000000",
      seizedCollateralUsd6: "550000000",
      healthFactorWadBefore: "900000000000000000",
      healthFactorWadAfter: "1100000000000000000",
    })
    expect(res.hash).toMatch(/^sim-liquidate-/)

    // The liquidator sees it as an outgoing liquidation.
    const liq = await asLiquidator.query(api.sandbox.liquidation.getLiquidations, { wallet: OTHER })
    expect(liq.asLiquidator).toHaveLength(1)
    expect(liq.asLiquidator[0]?.wallet).toBe(WALLET.toLowerCase())

    // The victim sees it as an incoming liquidation.
    const asVictim = t.withIdentity({ subject: WALLET })
    const victimView = await asVictim.query(api.sandbox.liquidation.getLiquidations, { wallet: WALLET })
    expect(victimView.asVictim).toHaveLength(1)
  })

  test("rejects a liquidation whose liquidatorWallet is not the caller", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.liquidation.recordLiquidation, {
        wallet: OTHER,
        liquidatorWallet: OTHER, // caller is WALLET, not OTHER
        repaidUsd6: "1",
        seizedCollateralUsd6: "1",
        healthFactorWadBefore: null,
        healthFactorWadAfter: null,
      }),
    ).rejects.toThrow(/LIQUIDATOR_MISMATCH/)
  })

  test("atomically reduces victim debt and collateral and records the transaction", async () => {
    const t = convexTest(schema, modules)
    const ids = await t.run(async (ctx) => {
      const positionId = await ctx.db.insert("positions", {
        wallet: WALLET.toLowerCase(),
        product: "borrow",
        marketSlug: "uni-v3-bluechip-weth-usdc",
        status: "open",
        collateralValueUsd6: "2000000000",
        debtValueUsd6: "1200000000",
        openedAt: 1,
        lastUpdatedAt: 1,
      })
      await ctx.db.insert("positionCollateral", {
        wallet: WALLET.toLowerCase(),
        positionId,
        marketSlug: "uni-v3-bluechip-weth-usdc",
        collateralShares: "2000000000",
        principalTokenAmount: "2000000000",
        collateralEnabled: true,
        collateralValueUsd6: "2000000000",
        updatedAt: 1,
      })
      const debtPositionId = await ctx.db.insert("positionDebt", {
        wallet: WALLET.toLowerCase(),
        positionId,
        assetId: "uni-v2:usdc",
        baseAssetId: "usdc",
        debtSharesUsd6: "1200000000",
        debtIndexRay: "1000000000000000000000000000",
        borrowRateWad: "50000000000000000",
        principalBorrowedUsd6: "1200000000",
        updatedAt: 1,
      })
      return { positionId, debtPositionId }
    })
    const asLiquidator = t.withIdentity({ subject: OTHER })
    await asLiquidator.mutation(api.sandbox.liquidation.recordLiquidation, {
      wallet: WALLET,
      liquidatorWallet: OTHER,
      positionId: ids.positionId,
      debtPositionId: ids.debtPositionId,
      marketSlug: "uni-v3-bluechip-weth-usdc",
      repaidUsd6: "500000000",
      seizedCollateralUsd6: "550000000",
      healthFactorWadBefore: "900000000000000000",
      healthFactorWadAfter: "1100000000000000000",
    })

    const state = await t.run(async (ctx) => ({
      position: await ctx.db.get(ids.positionId),
      debt: await ctx.db.get(ids.debtPositionId),
      collateral: await ctx.db
        .query("positionCollateral")
        .withIndex("by_position", (q) => q.eq("positionId", ids.positionId))
        .first(),
      transactions: await ctx.db
        .query("transactions")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", WALLET.toLowerCase()))
        .collect(),
      snapshots: await ctx.db
        .query("portfolioSnapshots")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", WALLET.toLowerCase()))
        .collect(),
    }))
    expect(state.position?.debtValueUsd6).toBe("700000000")
    expect(state.position?.collateralValueUsd6).toBe("1450000000")
    expect(state.debt?.principalBorrowedUsd6).toBe("700000000")
    expect(state.collateral?.collateralValueUsd6).toBe("1450000000")
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0]?.kind).toBe("liquidation")
    expect(state.snapshots).toHaveLength(1)
  })
})

describe("recordTransaction — server-side solvency re-derivation", () => {
  test("rejects an undercollateralized borrow (debt > liquidation value)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("insolvent", {
          amountUsd: 2000,
          requestedAmountUsd6: "2000000000",
          executedAmountUsd6: "2000000000",
          position: {
            status: "open",
            marketSlug: "uni-v3-bluechip-weth-usdc",
            debtValueUsd6: "2000000000", // $2000 debt vs $2000 collateral @ 85% = $1700 max
            collateral: [
              {
                marketSlug: "uni-v3-bluechip-weth-usdc",
                collateralShares: "2000000000",
                principalTokenAmount: "2000000000",
                collateralEnabled: true,
                collateralValueUsd6: "2000000000",
              },
            ],
          },
        }),
      ),
    ).rejects.toThrow(/undercollateralized|health factor/i)
  })

  test("rejects borrow debt with no backing collateral", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("unbacked", {
          position: {
            status: "open",
            marketSlug: "uni-v3-bluechip-weth-usdc",
            debtValueUsd6: "1000000000",
            collateral: [],
          },
        }),
      ),
    ).rejects.toThrow(/no backing collateral/i)
  })

  test("rejects borrow debt when collateral value is missing", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("unpriced-collateral", {
          position: {
            status: "open",
            marketSlug: "uni-v3-bluechip-weth-usdc",
            debtValueUsd6: "1000000000",
            collateral: [
              {
                marketSlug: "uni-v3-bluechip-weth-usdc",
                collateralShares: "2000000000",
                principalTokenAmount: "2000000000",
                collateralEnabled: true,
              },
            ],
          },
        }),
      ),
    ).rejects.toThrow(/no server-verifiable value/i)
  })

  test("rejects a multiply position above the protocol leverage ceiling", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(
        api.sandbox.transactions.recordTransaction,
        borrowIntent("overlev", {
          product: "multiply",
          kind: "multiply",
          marketSlug: "eth-usdt",
          position: {
            status: "open",
            marketSlug: "eth-usdt",
            collateralValueUsd: 15000,
            debtValueUsd: 14000, // equity 1000 → multiplier 15x (> 10 ceiling)
            multiplier: 15,
            ltv: 14000 / 15000,
          },
        }),
      ),
    ).rejects.toThrow(/multiplier exceeds the protocol maximum/i)
  })

  test("still accepts a healthy borrow (debt within liquidation value)", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    const res = await asUser.mutation(
      api.sandbox.transactions.recordTransaction,
      borrowIntent("healthy", {
        position: {
          status: "open",
          marketSlug: "uni-v3-bluechip-weth-usdc",
          debtValueUsd6: "1000000000", // $1000 debt vs $2000 collateral @ 85% = $1700 max
          collateral: [
            {
              marketSlug: "uni-v3-bluechip-weth-usdc",
              collateralShares: "2000000000",
              principalTokenAmount: "2000000000",
              collateralEnabled: true,
              collateralValueUsd6: "2000000000",
            },
          ],
        },
      }),
    )
    expect(res.receipt.status).toBe("success")
  })
})
