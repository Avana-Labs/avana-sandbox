import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("DashboardWalletTab pool mobile cells", () => {
  it("P2-02: separates pool amount, USD value, fees, and label on mobile", () => {
    const source = readFileSync(resolve(__dirname, "../dashboard-wallet-tab.tsx"), "utf8")
    const mobilePools = source.slice(
      source.indexOf('<div className="space-y-3 md:hidden">', source.indexOf("PoolsBalanceSection")),
    )
    // Shared mobile card hierarchy: Balance / Fees as labeled stat rows with
    // amount + supporting USD (or "Unclaimed fees") — not a cramped inline pair.
    expect(mobilePools).toMatch(/MarketMobileStatRow[\s\S]{0,120}Balance[\s\S]{0,200}formatPoolAmount/)
    expect(mobilePools).toMatch(/MarketMobileSupportingValue[\s\S]{0,80}exact\(row\.valueUsd\)/)
    expect(mobilePools).toMatch(/MarketMobileStatRow[\s\S]{0,120}Fees[\s\S]{0,250}Unclaimed fees/)
    expect(mobilePools).not.toMatch(/formatPoolAmount\(row\.amount\)\)\}<\/span>\s*<span className="ml-2/)
  })
})
