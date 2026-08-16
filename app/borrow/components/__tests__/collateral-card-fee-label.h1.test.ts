import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("mobile collateral card labels the LP fee as Fees, not APY (H1)", () => {
  it("mobile section metric reads Fees to match the desktop FEES column", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    const mobileSection = source.slice(source.indexOf("function SpokeMobileSection"))
    // The card's headline metric is the pool's LP trading fee (formatApy of the
    // fee band), not a yield APY — it must carry the same "Fees" label the
    // desktop table's FEES column uses.
    expect(mobileSection).toContain('label={t("Fees")}')
    expect(mobileSection).not.toContain('label={t("APY")}')
  })
})
