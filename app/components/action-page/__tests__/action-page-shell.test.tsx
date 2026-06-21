import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("ActionPageShell", () => {
  afterEach(() => {
    cleanup()
  })

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
    const { container } = render(
      <ActionPageShell mode="overlay" title="Deposit" subtitle="Configure and review your deposit.">
        <div>Overlay body</div>
      </ActionPageShell>,
    )

    const shell = container.querySelector('[data-testid="action-page-shell"]')
    expect(shell).toHaveAttribute("data-mode", "overlay")
    expect(await screen.findByText("Overlay body")).toBeInTheDocument()
  })
})
