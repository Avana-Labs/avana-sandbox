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
  it("uses a block link so the section's vertical spacing applies", () => {
    const source = readFileSync(resolve(__dirname, "../explore-loops-markets-table.tsx"), "utf8")
    const mobileCard = source.slice(source.indexOf("const MobileLoopCard"), source.indexOf("function TrendingLoopCard"))

    expect(mobileCard).toContain('<Link href={row.href} className="block">')
  })
})
