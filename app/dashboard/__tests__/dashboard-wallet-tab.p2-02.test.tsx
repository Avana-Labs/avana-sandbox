import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("DashboardWalletTab pool mobile cells", () => {
  it("P2-02: separates pool amount, USD value, fees, and label on mobile", () => {
    const source = readFileSync(resolve(__dirname, "../dashboard-wallet-tab.tsx"), "utf8")
    const mobilePools = source.slice(
      source.indexOf('<div className="space-y-3 md:hidden">', source.indexOf("PoolsBalanceSection")),
    )
    expect(mobilePools).toMatch(/flex flex-col gap-0\.5[\s\S]{0,200}formatPoolAmount/)
    expect(mobilePools).toMatch(/flex flex-col gap-0\.5[\s\S]{0,200}Unclaimed fees/)
    expect(mobilePools).not.toMatch(/formatPoolAmount\(row\.amount\)\)\}<\/span>\s*<span className="ml-2/)
  })
})
