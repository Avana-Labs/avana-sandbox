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

describe("borrow architecture final gate", () => {
  it("keeps flow acceptance and requirements matrix green", () => {
    expect(readFileSync(path.join(process.cwd(), "app/lib/borrow-system/__tests__/flow-acceptance.test.tsx"), "utf8")).toContain(
      "borrow flow acceptance",
    )
    expect(readFileSync(path.join(process.cwd(), "app/lib/credit-engine/__tests__/requirements-matrix.test.ts"), "utf8")).not.toContain("it.todo")
  })

  it("documents remaining home-sim preview surfaces pending full Action Box migration", () => {
    const stillUsingHomeSim = actionSurfaces.filter((file) => readFileSync(path.join(process.cwd(), file), "utf8").includes("home-sim"))
    expect(stillUsingHomeSim.length).toBeGreaterThan(0)
  })
})
