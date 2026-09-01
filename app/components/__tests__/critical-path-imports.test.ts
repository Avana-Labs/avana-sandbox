import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(__dirname, "../../..")
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8")

describe("critical-path import guardrails", () => {
  it("keeps framer-motion off the tab indicator", () => {
    const tabs = read("app/components/tab-primitives.tsx")
    expect(tabs).not.toMatch(/framer-motion/)
    expect(read("app/components/action-page/action-workspace-tabs.tsx")).not.toMatch(/cssOnly/)
  })

  it("keeps the layout / header off wallet SDK, Convex, and Radix menus", () => {
    const header = read("app/components/header.tsx")
    expect(header).not.toMatch(/framer-motion|connectkit|wagmi|@radix-ui\/react-dropdown-menu/)
    expect(header).toMatch(/desktop-preference-trigger/)
    const layout = read("app/layout.tsx")
    expect(layout).not.toMatch(/from ["']convex\/react["']/)
    expect(layout).not.toMatch(/from ["']wagmi["']/)
    expect(layout).toMatch(/display:\s*"swap"/)
    expect(layout).toMatch(/preload:\s*true/)
    expect(layout).toMatch(/adjustFontFallback:\s*"Arial"/)
  })

  it("tree-shakes icon barrels via optimizePackageImports", () => {
    const config = read("next.config.mjs")
    expect(config).toMatch(/optimizePackageImports/)
    expect(config).toMatch(/@hugeicons\/react/)
    expect(config).toMatch(/@hugeicons\/core-free-icons/)
    expect(config).toMatch(/productionBrowserSourceMaps/)
  })

  it("signed-in gate uses one combined onboarding query and a route skeleton", () => {
    const checker = read("app/components/sandbox/authed-sandbox-gate.tsx")
    expect(checker).toMatch(/getOnboardingGateState/)
    expect(checker).not.toMatch(/getWalletOnboardingState/)
    expect(checker).not.toMatch(/getEconomyStatus/)
    const gate = read("app/components/sandbox/sandbox-gate.tsx")
    expect(gate).toMatch(/RouteContentSkeleton/)
  })
})
