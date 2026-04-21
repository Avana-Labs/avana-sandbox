import { buildBorrowSnapshot, BORROW_ITEMS_PER_PAGE } from "@/app/lib/borrow-data"

describe("borrow data snapshot", () => {
  it("returns deterministic snapshot data", () => {
    expect(buildBorrowSnapshot()).toEqual(buildBorrowSnapshot())
  })

  it("includes protocol groups, pools, and pagination metadata", () => {
    const snapshot = buildBorrowSnapshot()

    expect(Object.keys(snapshot.protocols).length).toBeGreaterThan(1)
    expect(snapshot.allPools.length).toBeGreaterThan(0)
    expect(snapshot.protocolLogos).toBeDefined()
    expect(snapshot.itemsPerPage).toBe(BORROW_ITEMS_PER_PAGE)
  })
})
