import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"

afterEach(() => cleanup())

describe("ActionBlockedDialog", () => {
  it("renders inline blocked copy without a full-screen overlay", () => {
    const onClose = vi.fn()

    render(
      <ActionBlockedDialog
        variant="inline"
        open
        onClose={onClose}
        blocked={{
          title: "No LP tokens in your wallet",
          description: "Add liquidity first.",
          primaryCtaLabel: null,
          primaryCtaHref: null,
          secondaryCtaLabel: "Got it",
        }}
      />,
    )

    expect(screen.getByTestId("action-blocked-dialog")).toHaveAttribute("data-variant", "inline")
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument()
  })

  it("renders blocked copy and closes", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const view = render(
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

    expect(view.getByTestId("action-blocked-dialog")).toHaveAttribute("data-variant", "modal")
    await user.click(view.getByRole("button", { name: "Got it" }))
    expect(onClose).toHaveBeenCalled()
  })
})
