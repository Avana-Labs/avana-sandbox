import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("MarketMobileCard surfaces", () => {
  it("uses the shared flat product-card surface on every mobile market list", () => {
    const source = readFileSync(resolve(__dirname, "../market-card-primitives.tsx"), "utf8")
    const cardBlock = source.slice(
      source.indexOf("export function MarketMobileCard"),
      source.indexOf("export function MarketMobileCardHeader"),
    )
    expect(cardBlock).toMatch(/rounded-radius-md border-0 bg-card/)
    expect(cardBlock).toMatch(/shadow-none/)
    expect(cardBlock).not.toMatch(/hover:bg-hover/)
    expect(cardBlock).not.toMatch(/shadow-elev-1/)
  })
})
