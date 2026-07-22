import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("font-data decimal tracking", () => {
  it("P3-08: summary metrics use normal tracking to avoid spaced decimals", () => {
    const strip = readFileSync(resolve(__dirname, "../../../dashboard/borrow-tab/asset-positions-shared.tsx"), "utf8")
    const metrics = readFileSync(resolve(__dirname, "../../../dashboard/dashboard-metric-section.tsx"), "utf8")
    expect(strip).toMatch(/tracking-normal tabular-nums/)
    expect(metrics).toMatch(/tracking-normal tabular-nums/)
    expect(metrics).not.toMatch(/tracking-\[-0\.04em\]/)
  })
})
