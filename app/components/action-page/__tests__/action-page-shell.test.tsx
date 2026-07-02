import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { ThemeProvider } from "@/app/components/theme-provider"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe("ActionPageShell", () => {
  beforeAll(() => {
    // ThemeProvider resolves the system theme via matchMedia, which jsdom omits.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  afterEach(() => {
    cleanup()
  })

  const renderShell = (ui: React.ReactNode) =>
    render(
      <ThemeProvider>
        <DisplayPreferencesProvider>{ui}</DisplayPreferencesProvider>
      </ThemeProvider>,
    )

  it("renders action shell title, subtitle, close control, and body without wallet pill or help menu", async () => {
    renderShell(
      <ActionPageShell
        title="Borrow"
        subtitle="Configure and review your loan."
        closeHref="/borrow"
      >
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(await screen.findByRole("heading", { name: "Borrow" })).toBeInTheDocument()
    expect(screen.getByText("Configure and review your loan.")).toBeInTheDocument()
    expect(screen.getByLabelText("Close")).toBeInTheDocument()
    expect(screen.getByLabelText("Change language")).toBeInTheDocument()
    expect(screen.getByText("Body")).toBeInTheDocument()
    expect(screen.queryByText(/demo-w/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Open help menu")).not.toBeInTheDocument()
  })

  it("exposes currency, theme, and dollar-mask controls alongside the language switcher", async () => {
    renderShell(
      <ActionPageShell title="Borrow" subtitle="Configure and review your loan." closeHref="/borrow">
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(await screen.findByLabelText("Change language")).toBeInTheDocument()
    expect(screen.getByLabelText("Change currency")).toBeInTheDocument()
    // Theme toggle: matchMedia is stubbed to light, so it offers to switch to dark.
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument()
    // Dollar-mask toggle (defaults to shown → offers to hide).
    expect(screen.getByLabelText("Hide dollar amounts")).toBeInTheDocument()
  })

  it("does not render a sandbox badge when simulated", () => {
    renderShell(
      <ActionPageShell title="Borrow" subtitle="Configure and review your loan." simulated>
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(screen.queryByText("Simulated transaction")).not.toBeInTheDocument()
  })

  it("renders overlay mode on the shell root", async () => {
    const { container } = renderShell(
      <ActionPageShell mode="overlay" title="Deposit" subtitle="Configure and review your deposit.">
        <div>Overlay body</div>
      </ActionPageShell>,
    )

    const shell = container.querySelector('[data-testid="action-page-shell"]')
    expect(shell).toHaveAttribute("data-mode", "overlay")
    expect(await screen.findByText("Overlay body")).toBeInTheDocument()
  })
})
