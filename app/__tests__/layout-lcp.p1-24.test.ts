import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("root layout LCP", () => {
  it("p1-24: preloads Diatype with display:optional (loads early, never blocks first paint)", () => {
    const source = readFileSync(resolve(__dirname, "../layout.tsx"), "utf8")
    // preload puts the font on the critical path so it is fetched with first paint instead of
    // dead-last; display:optional guarantees it never blocks render or swaps mid-paint. Together the
    // branded font loads early AND there is no fallback->Diatype flash. (Was preload:false +
    // display:swap, which fetched the font ~800ms in and caused a visible font swap.)
    expect(source).toMatch(/preload:\s*true/)
    expect(source).toMatch(/display:\s*"optional"/)
  })
})
