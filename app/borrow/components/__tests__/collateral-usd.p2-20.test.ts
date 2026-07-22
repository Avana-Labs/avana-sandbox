import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("collateral table USD display", () => {
  it("P2-20: stops double-printing compact and full USD in collateral desktop cells", () => {
    const source = readFileSync(resolve(__dirname, "../collateral-pools-table.tsx"), "utf8")
    const desktop = source.slice(source.indexOf("function CollateralDesktopTable"))
    expect(desktop).not.toMatch(/compact\(pool\.tvlUsd\)[\s\S]{0,200}convert\(pool\.tvlUsd\)/)
    expect(desktop).not.toMatch(/compact\(pool\.availableUsd\)[\s\S]{0,200}convert\(pool\.availableUsd\)/)
  })
})
