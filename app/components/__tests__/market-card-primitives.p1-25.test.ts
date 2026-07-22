import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("MarketMobileCard surfaces", () => {
  it("p1-25: uses flat table-row surfaces instead of card chrome", () => {
    const source = readFileSync(resolve(__dirname, "../market-card-primitives.tsx"), "utf8")
    const cardBlock = source.slice(
      source.indexOf("export function MarketMobileCard"),
      source.indexOf("export function MarketMobileCardHeader"),
    )
    const insetBlock = source.slice(
      source.indexOf("export function MarketMobileInsetStats"),
      source.indexOf("export function MarketMobilePrimaryAction"),
    )

    // Flat row surface: a single bottom divider, no rounded card / shadow chrome.
    // The card sits on the hover/active surface (bg-hover) with NO :hover state —
    // on touch, :hover sticks after a tap, so it's dropped on mobile cards.
    expect(cardBlock).toMatch(/border-b border-border bg-hover/)
    expect(cardBlock).not.toMatch(/hover:bg-hover/)
    expect(cardBlock).not.toMatch(/shadow-elev-1/)
    expect(insetBlock).not.toMatch(/bg-surface-inset/)
    expect(insetBlock).toMatch(/border-t border-border bg-background/)
  })
})
