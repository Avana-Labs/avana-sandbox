import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DesktopHelpBubble } from "@/app/components/desktop-help-bubble"

describe("DesktopHelpBubble", () => {
  afterEach(cleanup)

  it("opens immediately when loaded from the intent-triggered launcher", () => {
    render(<DesktopHelpBubble initialOpen />)

    expect(screen.getByRole("button", { name: "Open help menu" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Terms of Service")).toBeInTheDocument()
    expect(screen.getByText("Support center")).toBeInTheDocument()
  })
})
