import { describe, expect, it } from "vitest"
import { paginateMultiplyRows } from "@/app/multiply/components/explore-loops-markets-table"

describe("paginateMultiplyRows", () => {
  it("returns distinct pages using the configured page size", () => {
    const rows = Array.from({ length: 25 }, (_, index) => index + 1)

    expect(paginateMultiplyRows(rows, 0, 12)).toEqual(rows.slice(0, 12))
    expect(paginateMultiplyRows(rows, 1, 12)).toEqual(rows.slice(12, 24))
    expect(paginateMultiplyRows(rows, 2, 12)).toEqual([25])
  })

  it("guards invalid page and page-size values", () => {
    expect(paginateMultiplyRows([1, 2, 3], -1, 0)).toEqual([1])
  })
})
