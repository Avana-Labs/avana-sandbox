import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Lend mobile asset card actions", () => {
  it("renders Capacity Filled with Deposit and Withdraw actions on mobile cards", () => {
    const source = readFileSync(resolve(__dirname, "../lend-asset-spokes.tsx"), "utf8")
    const cardView = source.slice(source.indexOf("function AssetCardView"), source.indexOf("function AssetSection"))
    expect(cardView).toMatch(/MarketMobilePrimaryAction/)
    expect(cardView).toMatch(/Deposit/)
    expect(cardView).toMatch(/MarketMobileSecondaryAction/)
    expect(cardView).toMatch(/Withdraw/)
    expect(cardView).toMatch(/Capacity Filled/)
    expect(cardView).toMatch(/actionPagePath\("lend", "withdraw"/)
  })

  it("keeps the desktop action column compact instead of leaving excess space on the right", () => {
    const source = readFileSync(resolve(__dirname, "../lend-asset-spokes.tsx"), "utf8")
    const colgroup = source.match(/<colgroup>([\s\S]*?)<\/colgroup>/)?.[1] ?? ""
    const widths = [...colgroup.matchAll(/w-\[(\d+)%\]/g)].map(([, width]) => Number(width))

    expect(widths).toHaveLength(7)
    expect(widths.at(-1)).toBe(12)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(100)
  })
})
