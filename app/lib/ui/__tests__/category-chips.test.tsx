import { fireEvent, render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CategoryChips } from "@/app/lib/ui/category-chips"
import { CATEGORY_CHIPS } from "@/app/lib/markets/category"

afterEach(() => cleanup())

describe("CategoryChips (shared category filter, #103)", () => {
  it("renders one tab per chip and marks the active one selected", () => {
    const { getAllByRole, getByRole } = render(
      <CategoryChips chips={CATEGORY_CHIPS.multiply} value="all" onChange={() => {}} />,
    )

    const tabs = getAllByRole("tab")
    expect(tabs).toHaveLength(CATEGORY_CHIPS.multiply.length)
    expect(getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true")
    expect(getByRole("tab", { name: "BTC Loops" })).toHaveAttribute("aria-selected", "false")
  })

  it("reports the shared category id (not a product-specific id) when a chip is clicked", () => {
    const onChange = vi.fn()
    const { getByRole } = render(<CategoryChips chips={CATEGORY_CHIPS.borrow} value="all" onChange={onChange} />)

    fireEvent.click(getByRole("tab", { name: "Utility Based" }))
    expect(onChange).toHaveBeenCalledWith("utility")

    fireEvent.click(getByRole("tab", { name: "Smart Lend" }))
    expect(onChange).toHaveBeenCalledWith("smart")
  })

  it("uses one shared id space across borrow / lend / multiply chip sets", () => {
    const ids = (chips: readonly { id: string }[]) => chips.map((chip) => chip.id).join(",")
    const expected = "all,btc,eth,forex,utility,smart"
    expect(ids(CATEGORY_CHIPS.borrow)).toBe(expected)
    expect(ids(CATEGORY_CHIPS.lend)).toBe(expected)
    expect(ids(CATEGORY_CHIPS.multiply)).toBe(expected)
  })
})
