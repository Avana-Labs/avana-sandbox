import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Borrow balance and asset summary mobile layout", () => {
  it("P2-13: uses responsive metric grid and stacks summary labels above values on mobile", () => {
    const metrics = readFileSync(resolve(__dirname, "../../dashboard-metric-section.tsx"), "utf8")
    const strip = readFileSync(resolve(__dirname, "../asset-positions-shared.tsx"), "utf8")
    expect(metrics).toMatch(/grid-cols-1[\s\S]{0,40}sm:grid-cols-2[\s\S]{0,40}lg:grid-cols-4/)
    expect(strip).toMatch(/flex flex-col gap-3 md:hidden/)
    expect(strip).toMatch(/flex flex-col gap-1/)
    expect(strip).not.toMatch(/justify-between gap-3 md:hidden/)
  })
})
