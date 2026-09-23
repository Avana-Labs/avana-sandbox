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
    const layout = source.match(/const LEND_TABLE_LAYOUT = tableColumnLayout\(\[([\s\S]*?)\]\)/)?.[1] ?? ""
    const kinds = [...layout.matchAll(/"([a-z0-9]+)"/g)].map(([, kind]) => kind)

    // Shared layout: the action column is the fixed single-button kind, not a stretchy share.
    expect(kinds).toHaveLength(7)
    expect(kinds.at(-1)).toBe("action")
  })
})
