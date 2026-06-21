import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"

describe("ActionBlockedDialog", () => {
  it("renders blocked copy and closes", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ActionBlockedDialog
        open
        onClose={onClose}
        blocked={{
          title: "You need to deposit an asset before you can borrow.",
          description: "Deposit collateral first.",
          primaryCtaLabel: "Deposit",
          primaryCtaHref: "/actions/borrow/supply",
          secondaryCtaLabel: "Got it",
        }}
      />,
    )

    expect(screen.getByTestId("action-blocked-dialog")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Got it" }))
    expect(onClose).toHaveBeenCalled()
  })
})
