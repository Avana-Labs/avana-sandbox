import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Collateral pool mobile card actions", () => {
  it("shows Capacity Filled with both Pledge and Borrow CTAs", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    const mobileSection = source.slice(source.indexOf("function SpokeMobileSection"))
    expect(mobileSection).toMatch(/MarketMobilePrimaryAction[\s\S]{0,400}Pledge/)
    expect(mobileSection).toMatch(/MarketMobileSecondaryAction[\s\S]{0,800}Borrow/)
    expect(mobileSection.indexOf('t("Capacity Filled")')).toBeLessThan(mobileSection.indexOf('t("Available")'))
  })
})
