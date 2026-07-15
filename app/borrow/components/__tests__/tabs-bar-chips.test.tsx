import { fireEvent, render, cleanup, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TabsBar } from "@/app/borrow/components/tabs-bar"
import { CATEGORY_CHIPS } from "@/app/lib/markets/category"

afterEach(() => cleanup())

function renderTabsBar(overrides: Partial<Parameters<typeof TabsBar>[0]> = {}) {
  const onTabChange = vi.fn()
  const utils = render(
    <TabsBar currentTab="all" onTabChange={onTabChange} search="" onSearchChange={() => {}} {...overrides} />,
  )
  return { onTabChange, ...utils }
}

describe("Borrow TabsBar uses the shared category chips (#103)", () => {
  it("renders the shared category chips as a tablist (no bespoke tab buttons / dropdown)", () => {
    const { getAllByRole } = renderTabsBar()

    const tablists = getAllByRole("tablist", { name: "Filter by category" })
    expect(tablists.length).toBeGreaterThan(0)

    // The shared chip labels are present (Borrow taxonomy).
    for (const chip of CATEGORY_CHIPS.borrow) {
      const tabsForChip = within(tablists[0]).getAllByRole("tab", { name: chip.label })
      expect(tabsForChip.length).toBeGreaterThan(0)
    }
  })

  it("emits the shared category id when a chip is selected", () => {
    const { onTabChange, getAllByRole } = renderTabsBar()
    const tablists = getAllByRole("tablist", { name: "Filter by category" })

    fireEvent.click(within(tablists[0]).getByRole("tab", { name: "ETH Based" }))
    expect(onTabChange).toHaveBeenCalledWith("eth")

    fireEvent.click(within(tablists[0]).getByRole("tab", { name: "Smart Lend" }))
    expect(onTabChange).toHaveBeenCalledWith("smart")
  })
})
