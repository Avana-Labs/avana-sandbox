import { fireEvent, render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TabsBar } from "@/app/borrow/components/tabs-bar"

vi.mock("@/app/components/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}))

afterEach(() => cleanup())

const dexes = [
  { id: "uniswap", label: "Uniswap" },
  { id: "curve", label: "Curve" },
] as unknown as Parameters<typeof TabsBar>[0]["dexes"]

function renderTabsBar() {
  return render(
    <TabsBar
      currentTab="all"
      onTabChange={vi.fn()}
      search=""
      onSearchChange={() => {}}
      dexes={dexes}
      selectedDexes={new Set()}
      onDexChange={() => {}}
    />,
  )
}

describe("Borrow DEX filter dropdown Escape handling (#128)", () => {
  it("closes the open dropdown when Escape is pressed", () => {
    const { queryAllByRole } = renderTabsBar()

    // Desktop + mobile both render a trigger; operate on the first.
    const trigger = queryAllByRole("button", { expanded: false })[0]
    fireEvent.click(trigger)
    expect(queryAllByRole("button", { expanded: true }).length).toBeGreaterThan(0)

    fireEvent.keyDown(document, { key: "Escape" })

    expect(queryAllByRole("button", { expanded: true })).toHaveLength(0)
  })
})
