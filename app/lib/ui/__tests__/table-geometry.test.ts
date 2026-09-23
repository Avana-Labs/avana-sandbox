import { describe, expect, it } from "vitest"
import {
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PRIMARY,
  TABLE_COLUMN_MIN_PX,
  TABLE_HEADER_ROW,
  tableColumnLayout,
  tableStickyCell,
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

describe("shared column layout", () => {
  it("sizes each column by its kind so shared columns match across tables", () => {
    const layout = tableColumnLayout(["index", "identity", "compact", "gauge", "action"])
    expect(layout.minWidth).toBe(
      TABLE_COLUMN_MIN_PX.index +
        TABLE_COLUMN_MIN_PX.identity +
        TABLE_COLUMN_MIN_PX.compact +
        TABLE_COLUMN_MIN_PX.gauge +
        TABLE_COLUMN_MIN_PX.action,
    )
    const total = layout.widths.reduce((sum, width) => sum + Number.parseFloat(width), 0)
    expect(total).toBeCloseTo(100, 1)
    // At min width every column is exactly its kind's minimum.
    expect((Number.parseFloat(layout.widths[1]) / 100) * layout.minWidth).toBeCloseTo(TABLE_COLUMN_MIN_PX.identity, 0)
  })

  it("keeps the pinned identity offset in sync with the index column", () => {
    expect(TABLE_COLUMN_MIN_PX.index).toBe(56)
    expect(tableStickyCell("body", { afterIndex: true, edge: true })).toContain("left-[56px]")
    expect(tableStickyCell("body")).toContain("bg-background")
    expect(tableStickyCell("body")).not.toContain("group-hover:bg-hover")
  })
})
