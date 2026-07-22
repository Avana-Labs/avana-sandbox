import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("Dashboard mobile quick-action rail", () => {
  it("P2-03: tabs lead on mobile, deleverage stays in one rail, pills use tokens", () => {
    const pageSource = readFileSync(resolve(__dirname, "../dashboard-page-client.tsx"), "utf8")
    const tabsAt = pageSource.indexOf("<UnderlineTabStrip")
    const mobileActionsAt = pageSource.indexOf("{/* Mobile: compact quick-action rail")
    expect(tabsAt).toBeGreaterThan(-1)
    expect(mobileActionsAt).toBeGreaterThan(-1)
    expect(tabsAt).toBeLessThan(mobileActionsAt)

    const actionsSource = readFileSync(resolve(__dirname, "../hero/dashboard-hero-actions.tsx"), "utf8")
    expect(actionsSource).toMatch(/flex-nowrap[\s\S]{0,40}overflow-x-auto/)
    expect(actionsSource).not.toMatch(/flex-wrap gap-2 md:hidden/)

    const cardSource = readFileSync(resolve(__dirname, "../hero/dashboard-hero-action-card.tsx"), "utf8")
    expect(cardSource).toMatch(/bg-brand\/10/)
    expect(cardSource).not.toMatch(/bg-\[#dff2fb\]/)
  })
})
