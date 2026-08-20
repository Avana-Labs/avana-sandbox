import { describe, expect, it } from "vitest"
import { aggregateNetValueUsd } from "@/app/dashboard/use-dashboard-portfolio-summary"
import type { UserAssetBalance } from "@/app/lib/swap-system"

/**
 * Pins the reconciliation the hero Net Value rests on: the hero == the signed sum of the
 * per-product nets (liquid + lend + borrowNet + multiplyNet), computed off the SAME
 * productBalances rows the Wallet/Lend/Borrow/Multiply tabs are hydrated from. Debt rows are
 * negative; umbrella is never a productBalances bucket, so it is out by construction. The
 * per-product tabs re-derive these numbers on the client from the same rows (see the
 * use-dashboard-portfolio-summary doc comment), so this decomposition is the guarantee that
 * the headline and the tabs can't silently diverge in what they count.
 */

const priceFor = (symbol: string): number | undefined => ({ ETH: 2000, USDC: 1, AAVE: 90 })[symbol.trim().toUpperCase()]

function row(partial: Partial<UserAssetBalance> & { assetId: string; amount: number }): UserAssetBalance {
  return { id: `${partial.assetId}:${partial.sourceType ?? "wallet"}`, walletId: "w", sourceType: "wallet", ...partial }
}

// A representative wallet spanning all four productBalances buckets, debt included.
const LIQUID: UserAssetBalance[] = [
  row({ assetId: "usdc", amount: 1000, valueUsd: 1000, sourceType: "wallet" }),
  row({ assetId: "eth", amount: 0.1, valueUsd: 193, sourceType: "wallet" }), // re-priced live → 200
]
const LEND: UserAssetBalance[] = [
  row({ assetId: "lend-usdc", amount: 500, valueUsd: 500, sourceType: "lend_deposited" }),
]
const BORROW: UserAssetBalance[] = [
  row({ assetId: "weth-usdc-pool", amount: 8, valueUsd: 800, sourceType: "borrow_collateral_pledged" }), // LP: stored basis
  row({ assetId: "usdc", amount: 300, valueUsd: -300, sourceType: "borrow_debt" }), // debt: negative
]
const MULTIPLY: UserAssetBalance[] = [
  row({ assetId: "eth", amount: 0.5, valueUsd: 1000, sourceType: "multiply_active" }), // re-priced live → 1000
  row({ assetId: "usdc", amount: 250, valueUsd: -250, sourceType: "multiply_debt" }), // debt: negative
]

describe("dashboard Net Value == Σ per-product nets", () => {
  it("the hero total equals the sum of the four per-product nets", () => {
    const all = [...LIQUID, ...LEND, ...BORROW, ...MULTIPLY]
    const hero = aggregateNetValueUsd(all, priceFor)

    const liquidNet = aggregateNetValueUsd(LIQUID, priceFor)
    const lendNet = aggregateNetValueUsd(LEND, priceFor)
    const borrowNet = aggregateNetValueUsd(BORROW, priceFor)
    const multiplyNet = aggregateNetValueUsd(MULTIPLY, priceFor)

    expect(hero).toBeCloseTo(liquidNet + lendNet + borrowNet + multiplyNet, 6)
  })

  it("computes the expected concrete figure with live pricing, LP stored basis, and signed debt", () => {
    const all = [...LIQUID, ...LEND, ...BORROW, ...MULTIPLY]
    // liquid: 1000 + (0.1×2000=200) = 1200
    // lend:   500 (unpriced slug → stored)
    // borrow: 800 (LP stored) − 300 (debt) = 500
    // mult:   1000 (0.5×2000) − 250 (debt) = 750
    // total = 1200 + 500 + 500 + 750 = 2950
    expect(aggregateNetValueUsd(all, priceFor)).toBeCloseTo(2950, 6)
  })

  it("adding an umbrella-style position would change a naive sum — confirming why it's excluded upstream", () => {
    // Umbrella is never in productBalances, so it never reaches aggregateNetValueUsd. This asserts
    // the function has no special-casing that would fold one in: an extra positive row simply adds.
    const all = [...LIQUID, ...LEND, ...BORROW, ...MULTIPLY]
    const base = aggregateNetValueUsd(all, priceFor)
    const withUmbrellaLike = aggregateNetValueUsd(
      [...all, row({ assetId: "umbrella-staked", amount: 1, valueUsd: 5000, sourceType: "wallet" })],
      priceFor,
    )
    expect(withUmbrellaLike - base).toBeCloseTo(5000, 6)
  })
})
