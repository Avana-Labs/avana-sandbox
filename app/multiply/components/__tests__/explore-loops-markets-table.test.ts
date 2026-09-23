import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { isNegativeMultiplyApy } from "@/app/multiply/components/explore-loops-markets-table"

describe("isNegativeMultiplyApy", () => {
  it("identifies loss-making strategies from formatted APY labels", () => {
    expect(isNegativeMultiplyApy("-2.92%")).toBe(true)
    expect(isNegativeMultiplyApy("7.83%")).toBe(false)
    expect(isNegativeMultiplyApy("—")).toBe(false)
  })
})

describe("mobile loop card spacing", () => {
  it("keeps a block market link and two mobile actions", () => {
    const source = readFileSync(resolve(__dirname, "../explore-loops-markets-table.tsx"), "utf8")
    const mobileCard = source.slice(source.indexOf("const MobileLoopCard"), source.indexOf("function TrendingLoopCard"))

    expect(mobileCard).toContain('<MarketMobileCard className="block">')
    expect(mobileCard).toMatch(/<Link[\s\S]*?href=\{row\.href\}/)
    expect(mobileCard).toContain("<MarketMobilePrimaryAction")
    expect(mobileCard).toContain("<MarketMobileSecondaryAction")
    expect(mobileCard).toContain('actionPagePath("multiply", "deleverage"')
  })
})

describe("multiply capacity table", () => {
  it("shows Capacity Filled before Available and removes the Deleverage row action", () => {
    const source = readFileSync(resolve(__dirname, "../explore-loops-markets-table.tsx"), "utf8")
    const section = source.slice(source.indexOf("function LoopMarketsSection"), source.indexOf("const LoopTableRow"))
    const row = source.slice(source.indexOf("const LoopTableRow"), source.indexOf("const MobileLoopCard"))
    const mobileCard = source.slice(source.indexOf("const MobileLoopCard"), source.indexOf("function TrendingLoopCard"))

    expect(section.indexOf('t("Capacity Filled")')).toBeLessThan(section.indexOf('t("Available")'))
    expect(row).toContain("<CapacityFilled value={row.capacityFilledPct} />")
    expect(row).not.toMatch(/Deleverage/)
    expect(mobileCard.indexOf('t("Capacity Filled")')).toBeLessThan(mobileCard.indexOf('t("Available")'))
    expect(mobileCard).toContain("<CapacityFilled value={row.capacityFilledPct} />")
  })
})
