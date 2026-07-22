import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("detail key statistics layout", () => {
  it("P2-18: key statistics grids use full-width columns on mobile", () => {
    const quickStats = readFileSync(resolve(__dirname, "../QuickStatsGrid.tsx"), "utf8")
    const protocol = readFileSync(resolve(__dirname, "../ProtocolParametersSection.tsx"), "utf8")
    expect(quickStats).toMatch(/grid w-full grid-cols-2[\s\S]{0,80}sm:grid-cols-3/)
    expect(protocol).toMatch(/grid w-full grid-cols-2[\s\S]{0,80}sm:grid-cols-4/)
  })
})
