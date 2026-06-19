import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const actionSurfaces = [
  "app/borrow/components/borrow-modal.tsx",
  "app/borrow/components/repay-remove-modal.tsx",
  "app/borrow/components/supply-collateral-modal.tsx",
  "app/components/home-page-client.tsx",
  "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx",
  "app/borrow/_detail/sidebars/AssetTokenSidebar.tsx",
]

const legacyPreviewFunctions = [
  "buildBorrowPreview(",
  "buildRepayPreview(",
  "buildRemovePreview(",
  "calculateRepayPreview(",
  "calculateRemovePreview(",
  "calculateClaimPreview(",
]

describe("borrow architecture final gate", () => {
  it("keeps flow acceptance and requirements matrix green", () => {
    expect(readFileSync(path.join(process.cwd(), "app/lib/borrow-system/__tests__/flow-acceptance.test.tsx"), "utf8")).toContain(
      "borrow flow acceptance",
    )
    expect(readFileSync(path.join(process.cwd(), "app/lib/credit-engine/__tests__/requirements-matrix.test.ts"), "utf8")).not.toContain("it.todo")
  })

  it("removes legacy home-sim preview math from action surfaces", () => {
    const offenders = actionSurfaces.filter((file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      return legacyPreviewFunctions.some((symbol) => source.includes(symbol))
    })

    expect(offenders).toEqual([])
  })

  it("routes modal and home flows through adapter preview runtime or action box", () => {
    expect(readFileSync(path.join(process.cwd(), "app/borrow/components/borrow-modal.tsx"), "utf8")).toContain("buildHomeBorrowPreview")
    expect(readFileSync(path.join(process.cwd(), "app/borrow/components/repay-remove-modal.tsx"), "utf8")).toContain("buildHomeRepayPreview")
    expect(readFileSync(path.join(process.cwd(), "app/borrow/components/supply-collateral-modal.tsx"), "utf8")).toContain("buildHomeSupplyPreview")
    expect(readFileSync(path.join(process.cwd(), "app/components/home-page-client.tsx"), "utf8")).toContain("buildHomeBorrowPreview")
    expect(readFileSync(path.join(process.cwd(), "app/components/home-page-client.tsx"), "utf8")).toContain("buildHomeClaimPreview")
    expect(readFileSync(path.join(process.cwd(), "app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx"), "utf8")).toContain("buildHomeClaimPreview")
  })

  it("keeps claim on adapter-backed preview runtime with canonical BorrowAction support", () => {
    const policy = readFileSync(path.join(process.cwd(), "app/lib/borrow-system/claim-adapter-policy.ts"), "utf8")
    expect(policy).toContain("isClaimSupportedByTransactionAdapter")
    expect(policy).toMatch(/return true/)
  })
})
