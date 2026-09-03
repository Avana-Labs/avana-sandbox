import { describe, expect, it } from "vitest"
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PRIMARY,
  TABLE_HEADER_ROW,
} from "@/app/lib/ui/table-row-hover"

describe("desktop table geometry", () => {
  it("uses one header height, row height, and edge padding", () => {
    expect(TABLE_HEADER_ROW).toContain("h-[33px]")
    expect(TABLE_HEADER_ROW).toContain("[&>th:first-child]:pl-6")
    expect(TABLE_HEADER_ROW).toContain("[&>th:last-child]:pr-5")
    expect(TABLE_HEADER_ROW).toContain("font-normal")
    expect(TABLE_BODY_ROW).toBe("h-[72px]")
    expect(TABLE_BASE).toBe("text-[12px]")
    expect(TABLE_CELL_PRIMARY).toContain("text-[15px]")
    expect(TABLE_CELL_PRIMARY).toContain("font-normal")
  })

  it("keeps token amounts on one line in numeric cells", () => {
    expect(TABLE_CELL_NUMERIC).toContain("whitespace-nowrap")
  })
})
