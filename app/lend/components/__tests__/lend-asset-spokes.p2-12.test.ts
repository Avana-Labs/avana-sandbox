import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Lend mobile asset card actions", () => {
  it("renders Capacity Filled and Deposit without a Withdraw action", () => {
    const source = readFileSync(resolve(__dirname, "../lend-asset-spokes.tsx"), "utf8")
    const cardView = source.slice(source.indexOf("function AssetCardView"), source.indexOf("function AssetSection"))
    expect(cardView).toMatch(/MarketMobilePrimaryAction/)
    expect(cardView).toMatch(/Deposit/)
    expect(cardView).toMatch(/Capacity Filled/)
    expect(cardView).not.toMatch(/Withdraw|actionPagePath/)
  })
})
