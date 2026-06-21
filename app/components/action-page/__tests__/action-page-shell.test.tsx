import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("ActionPageShell", () => {
  it("renders Avana action shell title, subtitle, wallet pill, and close control", () => {
    render(
      <ActionPageShell
        title="Borrow"
        subtitle="Configure and review your loan."
        walletLabel="0x4141...6ffE"
        closeHref="/borrow"
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

  it("does not render a sandbox badge when simulated", () => {
    render(
      <ActionPageShell title="Borrow" subtitle="Configure and review your loan." simulated>
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(screen.queryByText("Simulated transaction")).not.toBeInTheDocument()
  })

  it("renders overlay mode on the shell root", async () => {
    render(
      <ActionPageShell mode="overlay" title="Deposit" subtitle="Configure and review your deposit.">
        <div>Overlay body</div>
      </ActionPageShell>,
    )

    expect(await screen.findByTestId("action-page-shell")).toHaveAttribute("data-mode", "overlay")
  })
})
