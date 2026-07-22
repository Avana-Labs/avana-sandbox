import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("collateral pool label disambiguation", () => {
  // Pool name cells render the pair name plus a plain TVL subtitle. The DEX/LP-type
  // (venue) string was dropped as noise — venue/version disambiguation is carried by
  // the section grouping headings (e.g. "Uniswap v2 LPs" / "Uniswap v3 Blue-Chip LPs"),
  // not an inline venue-context helper.
  it("p1-14: pool name cells render a TVL subtitle with no inline venue string", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    expect(source).toMatch(/const subtitle = .*compact\(pool\.tvlUsd\).*TVL/)
    expect(source).not.toMatch(/pairExchangeRateLabel\(/)
  })
})
