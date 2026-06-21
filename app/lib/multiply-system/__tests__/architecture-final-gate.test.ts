import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const multiplyActionSurfaces = [
  "app/multiply/components/multiply-action-box.tsx",
  "app/components/action-page/multiply-action-page-client.tsx",
  "app/multiply/_detail/sidebars/MarketSidebar.tsx",
  "app/dashboard/dashboard-client.tsx",
]

describe("multiply architecture final gate", () => {
  it("keeps requirements matrix and session tests present", () => {
    expect(readFileSync(path.join(process.cwd(), "app/lib/multiply-engine/__tests__/validation.test.ts"), "utf8")).toContain(
      "validateMultiplyAction",
    )
    expect(readFileSync(path.join(process.cwd(), "app/lib/multiply-system/__tests__/use-multiply-session.test.tsx"), "utf8")).toContain(
      "useMultiplySession",
    )
    expect(readFileSync(path.join(process.cwd(), "app/lib/multiply-engine/__tests__/requirements-matrix.test.ts"), "utf8")).not.toContain("it.todo")
  })

  it("routes multiply UI through shared avana session context", () => {
    const offenders = multiplyActionSurfaces.filter((file) => {
      const source = readFileSync(path.join(process.cwd(), file), "utf8")
      return source.includes("useMultiplySession({")
    })

    expect(offenders).toEqual([])
    expect(readFileSync(path.join(process.cwd(), "app/dashboard/dashboard-client.tsx"), "utf8")).toContain("useAvanaSessions")
    expect(readFileSync(path.join(process.cwd(), "app/dashboard/dashboard-client.tsx"), "utf8")).toContain("actionPagePath")
    expect(readFileSync(path.join(process.cwd(), "app/components/avana-session-providers.tsx"), "utf8")).toContain(
      "AvanaSessionsProvider",
    )
  })

  it("keeps production multiply adapters stubbed behind not-implemented guards", () => {
    const readAdapter = readFileSync(path.join(process.cwd(), "app/lib/multiply-system/production-read-adapter.ts"), "utf8")
    const txAdapter = readFileSync(
      path.join(process.cwd(), "app/lib/multiply-system/production-transaction-adapter.ts"),
      "utf8",
    )

    expect(readAdapter).toContain("not implemented")
    expect(txAdapter).toContain("not implemented")
  })
})
