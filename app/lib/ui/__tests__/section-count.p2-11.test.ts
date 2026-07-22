import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { formatSectionCount } from "@/app/lib/ui/section-count"

describe("section count labels", () => {
  it("P2-11: uses singular forms when count is 1", () => {
    expect(formatSectionCount(1, "asset", "assets")).toBe("1 asset")
    expect(formatSectionCount(1, "loan", "loans")).toBe("1 loan")
    expect(formatSectionCount(2, "asset", "assets")).toBe("2 assets")

    const collateral = readFileSync(
      resolve(__dirname, "../../../dashboard/borrow-tab/collateral-positions-panel.tsx"),
      "utf8",
    )
    const debt = readFileSync(resolve(__dirname, "../../../dashboard/borrow-tab/debt-positions-panel.tsx"), "utf8")
    expect(collateral).toMatch(/formatSectionCount\(rows\.length,\s*"asset",\s*"assets"\)/)
    expect(debt).toMatch(/formatSectionCount\(rows\.length,\s*"loan",\s*"loans"\)/)
    expect(collateral).not.toMatch(/t\("\{count\} assets"\)/)
    expect(debt).not.toMatch(/t\("\{count\} loans"\)/)
  })
})
