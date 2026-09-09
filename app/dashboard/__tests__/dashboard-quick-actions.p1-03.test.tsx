import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DashboardQuickActions } from "@/app/dashboard/dashboard-quick-actions"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

describe("P1-03: borrow tab deposit and withdraw routing", () => {
  it("routes Borrow-tab Pledge and Remove quick actions to collateral pledge/remove", () => {
    render(<DashboardQuickActions activeTab="borrow" />)

    expect(screen.getByRole("link", { name: "Pledge" }).getAttribute("href")).toContain("/actions/borrow/supply")
    expect(screen.getByRole("link", { name: "Remove" }).getAttribute("href")).toContain("/actions/borrow/remove")
  })
})
