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
    // Flat row surface: a single bottom divider, no rounded card / shadow chrome.
    // The card sits on the hover/active surface (bg-hover) with NO :hover state —
    // on touch, :hover sticks after a tap, so it's dropped on mobile cards.
    expect(cardBlock).toMatch(/border-b border-border bg-hover/)
    expect(cardBlock).not.toMatch(/hover:bg-hover/)
    expect(cardBlock).not.toMatch(/shadow-elev-1/)
  })

  it("defines one mobile identity and supporting-value type hierarchy", () => {
    const source = readFileSync(resolve(__dirname, "../market-card-primitives.tsx"), "utf8")
    const identity = source.slice(
      source.indexOf("export function MarketMobileIdentityText"),
      source.indexOf("export function MarketMobileSupportingValue"),
    )

    expect(identity).toMatch(/text-\[15px\].*font-medium/)
    expect(identity).toMatch(/text-\[12px\].*font-normal/)
    expect(source).toMatch(/MarketMobileSupportingValue[\s\S]*text-\[12px\]/)
  })

  it("defines one action footer with stable spacing and column variants", () => {
    const source = readFileSync(resolve(__dirname, "../market-card-primitives.tsx"), "utf8")
    const footer = source.slice(source.indexOf("export function MarketMobileActionFooter"))

    expect(footer).toMatch(/mt-4 grid gap-2/)
    expect(footer).toMatch(/columns === 1[\s\S]*grid-cols-1/)
    expect(footer).toMatch(/columns === 2[\s\S]*grid-cols-2[\s\S]*grid-cols-3/)
    expect(footer).toMatch(/\[&>button\]:mt-0/)
  })
})
