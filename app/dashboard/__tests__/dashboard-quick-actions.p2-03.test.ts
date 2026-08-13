import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("Dashboard quick-action placement", () => {
  it("P2-03: quick actions sit under claim cards in the hero as an icon rail", () => {
    const heroSource = readFileSync(resolve(__dirname, "../_rewards-components/rewards-balance-hero.tsx"), "utf8")
    expect(heroSource).toMatch(/showQuickActions/)
    expect(heroSource).toMatch(/DashboardQuickActions/)

    const pageSource = readFileSync(resolve(__dirname, "../dashboard-page-client.tsx"), "utf8")
    expect(pageSource).not.toMatch(/Mobile: compact quick-action rail/)
    expect(pageSource).not.toMatch(/<DashboardQuickActions/)

    const actionsSource = readFileSync(resolve(__dirname, "../dashboard-quick-actions.tsx"), "utf8")
    expect(actionsSource).toMatch(/rounded-full bg-field-bottom/)
    expect(actionsSource).not.toMatch(/DashboardHeroActions/)
    expect(actionsSource).not.toMatch(/min-h-\[94px\]/)
  })
})
