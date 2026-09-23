import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("collateral table labels the LP fee as Fees, not APY (H1)", () => {
  it("the fee column (desktop and phone share the table) reads Fees", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    const table = source.slice(source.indexOf("function CollateralDesktopTable"))
    // The column is the pool's LP trading fee (formatApy of the fee band), not a yield APY.
    expect(table).toContain('sortHeader("apy", t("Fees"))')
    expect(table).not.toContain('t("APY")')
  })
})
