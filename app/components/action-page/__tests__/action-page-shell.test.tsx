import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"

describe("ActionPageShell", () => {
  it("renders Avana action shell title, subtitle, wallet pill, and close control", () => {
    render(
      <ActionPageShell
        title="Borrow"
        subtitle="Configure and review your loan."
        walletLabel="0x4141...6ffE"
        onClose={vi.fn()}
      >
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(screen.getByRole("heading", { name: "Borrow" })).toBeInTheDocument()
    expect(screen.getByText("Configure and review your loan.")).toBeInTheDocument()
    expect(screen.getByText("0x4141...6ffE")).toBeInTheDocument()
    expect(screen.getByLabelText("Close")).toBeInTheDocument()
    expect(screen.getByText("Body")).toBeInTheDocument()
  })

  it("shows sandbox badge when simulated", () => {
    render(
      <ActionPageShell title="Borrow" subtitle="Configure and review your loan." simulated>
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
  })

  it("hides top chrome in embedded mode", () => {
    render(
      <ActionPageShell mode="embedded" title="Deposit" subtitle="Configure and review your deposit.">
        <div>Embedded body</div>
      </ActionPageShell>,
    )

    expect(screen.queryByLabelText("Close")).not.toBeInTheDocument()
    expect(screen.getByTestId("action-page-shell")).toHaveAttribute("data-mode", "embedded")
  })
})
