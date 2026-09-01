import { describe, expect, it } from "vitest"
import { TABLE_BODY_ROW, TABLE_HEADER_ROW } from "@/app/lib/ui/table-row-hover"

describe("desktop table geometry", () => {
  it("uses one header height, row height, and edge padding", () => {
    expect(TABLE_HEADER_ROW).toContain("h-[33px]")
    expect(TABLE_HEADER_ROW).toContain("[&>th:first-child]:pl-6")
    expect(TABLE_HEADER_ROW).toContain("[&>th:last-child]:pr-5")
    expect(TABLE_BODY_ROW).toBe("h-[72px]")
  })
})
