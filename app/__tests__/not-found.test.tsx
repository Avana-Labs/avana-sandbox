import { cleanup, render, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import NotFound from "@/app/not-found"

afterEach(cleanup)

describe("NotFound recovery links (#141)", () => {
  it("leads with a Home link and never points to the redirect-only /express route", () => {
    const { getByRole, queryByRole } = render(<NotFound />)

    const home = getByRole("link", { name: "Home" })
    expect(home).toHaveAttribute("href", "/")

    // The old first option redirected straight back home — it must be gone.
    expect(queryByRole("link", { name: "Express" })).not.toBeInTheDocument()
    const allLinks = Array.from(document.querySelectorAll("a")).map((a) => a.getAttribute("href"))
    expect(allLinks).not.toContain("/express")
  })

  it("offers useful destination links", () => {
    const { getByRole } = render(<NotFound />)
    const nav = getByRole("navigation", { name: "Helpful links" })

    for (const [label, href] of [
      ["Borrow", "/borrow"],
      ["Lend", "/lend"],
      ["Multiply", "/multiply"],
      ["Portfolio", "/portfolio"],
    ] as const) {
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", href)
    }
  })
})
