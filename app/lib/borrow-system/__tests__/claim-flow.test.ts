import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { buildHomeClaimPreview } from "@/app/lib/borrow-system/home-runtime"
import {
  CLAIM_ADAPTER_EXCLUSION_REASON,
  isClaimSupportedByTransactionAdapter,
} from "@/app/lib/borrow-system/claim-adapter-policy"
import {
  HOME_CLAIM_POSITIONS,
  HOME_INITIAL_CLAIMABLE_TOTALS,
  HOME_INITIAL_CLAIM_SELECTIONS,
} from "@/app/lib/home-sim"

describe("claim adapter policy", () => {
  it("explicitly excludes claim from the canonical transaction adapter path", () => {
    expect(isClaimSupportedByTransactionAdapter()).toBe(false)
    expect(CLAIM_ADAPTER_EXCLUSION_REASON).toContain("BorrowAction")
  })
})

describe("home claim preview runtime", () => {
  it("builds claim preview from home-sim position state", () => {
    const preview = buildHomeClaimPreview(
      HOME_CLAIM_POSITIONS,
      HOME_INITIAL_CLAIMABLE_TOTALS,
      HOME_INITIAL_CLAIM_SELECTIONS,
      null,
    )

    expect(preview.hasSelection).toBe(true)
    expect(preview.selectedPositionIds).toEqual(["claim-eth-usdc", "claim-usdc-usdt"])
    expect(preview.effectiveClaimUsd).toBe(142 + 62.4)
    expect(preview.tokenTotals.ETH).toBeGreaterThan(0)
  })

  it("caps partial claim amounts at the selected position total", () => {
    const preview = buildHomeClaimPreview(
      HOME_CLAIM_POSITIONS,
      HOME_INITIAL_CLAIMABLE_TOTALS,
      { "claim-eth-usdc": true, "claim-usdc-usdt": false, "claim-wbtc-eth": false },
      200,
    )

    expect(preview.effectiveClaimUsd).toBe(142)
    expect(preview.hasCustomAmount).toBe(true)
  })

  it("requires at least one selected position before allowing claim", () => {
    const preview = buildHomeClaimPreview(
      HOME_CLAIM_POSITIONS,
      HOME_INITIAL_CLAIMABLE_TOTALS,
      { "claim-eth-usdc": false, "claim-usdc-usdt": false, "claim-wbtc-eth": false },
      null,
    )

    expect(preview.hasSelection).toBe(false)
    expect(preview.ctaLabel).toBe("Select positions to claim")
  })
})

describe("claim flow surfaces", () => {
  const claimSurfaces = ["app/components/home-page-client.tsx", "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx"]

  it("routes claim UI through buildHomeClaimPreview instead of direct home-sim math", () => {
    const offenders = claimSurfaces.filter((file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      return source.includes("calculateClaimPreview(")
    })

    expect(offenders).toEqual([])
  })

  it("labels pool-detail claim transaction flow as simulated", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx"),
      "utf8",
    )
    expect(source).toContain("buildHomeClaimPreview")
    expect(source).toMatch(/TransactionFlowPanel[\s\S]*simulated/)
  })
})
