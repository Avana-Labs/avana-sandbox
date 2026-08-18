import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("collateral pool label disambiguation", () => {
  // Pool name cells render the pair name plus the live pool price sub-label — the pair spot
  // rate priced in the quote leg (e.g. "33.71 WETH"), which differs per pool. It falls back to
  // a plain fee-tier + TVL string when a leg is unpriced. The DEX/LP-type (venue) string stays
  // dropped as noise — venue/version disambiguation is carried by the section grouping headings.
  it("p1-14: pool name cells render the pair-rate price sub-label with a fee/TVL fallback, no venue string", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    // Primary sub-label: the pair spot rate in the quote leg's units.
    expect(source).toMatch(/formatPairRate\(p0 \/ p1\)/)
    // Fallback: fee tier + TVL when unpriced.
    expect(source).toMatch(/compact\(pool\.tvlUsd\).*TVL/)
    // No inline venue string.
    expect(source).not.toMatch(/allocationVenueLabel\(|`\$\{pool\.venue\}/)
  })
})
