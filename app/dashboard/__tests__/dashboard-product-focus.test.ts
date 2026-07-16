import { afterEach, describe, expect, it, vi } from "vitest"
import { focusDashboardProduct } from "@/app/dashboard/dashboard-product-focus"

afterEach(() => {
  document.body.replaceChildren()
})

describe("focusDashboardProduct", () => {
  it.each([
    ["overview", "dashboard-borrow-account"],
    ["looping", "dashboard-multiply-account"],
  ] as const)("focuses and scrolls the %s dashboard section", (tab, id) => {
    const section = document.createElement("section")
    section.id = id
    section.tabIndex = -1
    section.scrollIntoView = vi.fn()
    document.body.append(section)

    expect(focusDashboardProduct(tab)).toBe(true)
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: "start" })
    expect(document.activeElement).toBe(section)
  })

  it("returns false for the lending tab (its section moved to the rewards page)", () => {
    expect(focusDashboardProduct("lending")).toBe(false)
  })
})
