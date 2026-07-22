import { render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { DashboardQuickActions } from "@/app/dashboard/dashboard-quick-actions"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

describe("P1-03: borrow tab deposit and withdraw routing", () => {
  it("routes Borrow-tab Deposit and Withdraw quick actions to collateral pledge/remove", () => {
    render(<DashboardQuickActions activeTab="borrow" />)

    expect(
      screen
        .getAllByRole("link", { name: "Deposit" })
        .every((link) => link.getAttribute("href")?.includes("/actions/borrow/supply")),
    ).toBe(true)
    expect(
      screen
        .getAllByRole("link", { name: "Withdraw" })
        .every((link) => link.getAttribute("href")?.includes("/actions/borrow/remove")),
    ).toBe(true)
  })

  it("routes collateral position panel Deposit and Withdraw to borrow pledge/remove", () => {
    const source = readFileSync(resolve(__dirname, "../borrow-tab/collateral-positions-panel.tsx"), "utf8")

    expect(source).toContain('actionPagePath("borrow", "supply"')
    expect(source).toContain('actionPagePath("borrow", "remove"')
    expect(source).not.toContain('actionPagePath("lend", "deposit"')
    expect(source).not.toContain('actionPagePath("lend", "withdraw"')
  })
})
