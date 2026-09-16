import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("DashboardWalletTab pool mobile cells", () => {
  it("P2-02: renders a non-redundant pool balance on mobile", () => {
    const source = readFileSync(resolve(__dirname, "../dashboard-wallet-tab.tsx"), "utf8")
    const mobilePools = source.slice(
      source.indexOf('<div className="space-y-3 md:hidden">', source.indexOf("PoolsBalanceSection")),
    )
    // Pool fees are not sourced yet, so the mobile card only exposes the balance.
    expect(mobilePools).toMatch(/MarketMobileStatRow[\s\S]{0,120}Balance[\s\S]{0,300}exact\(row\.valueUsd\)/)
    expect(mobilePools).toMatch(/row\.unitPriceUsd[\s\S]{0,180}formatPoolAmount\(row\.amount\)/)
    expect(mobilePools).not.toMatch(/MarketMobileStatRow[\s\S]{0,120}Fees[\s\S]{0,250}Unclaimed fees/)
  })
})
