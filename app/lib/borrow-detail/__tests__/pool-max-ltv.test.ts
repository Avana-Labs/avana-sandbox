import { describe, expect, it } from "vitest"
import { BORROW_POOL_CATALOG, getSpokeById } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail/allocation"
import { buildPoolDetail } from "@/app/lib/borrow-detail/pool.mock"

describe("pool detail Max LTV single-sources the collateral factor", () => {
  it("renders the quick-stats Max LTV from row.ltv, matching the list and action page", () => {
    // Guard: at least one pool's collateral factor differs from its spoke max, so the
    // detail page could previously show a value the list never does.
    const divergent = BORROW_POOL_CATALOG.find((row) => row.ltv !== getSpokeById(row.spoke).maxLtv)
    expect(divergent).toBeDefined()

    for (const row of BORROW_POOL_CATALOG) {
      const detail = buildPoolDetail(row)
      const maxLtv = detail.about.governanceParameters?.parameters.find((parameter) => parameter.id === "ltv")
      expect(maxLtv?.value).toBe(formatPct(row.ltv, 1))
    }
  })
})
