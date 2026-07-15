import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import ActionsLayout from "@/app/actions/layout"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { ThemeProvider } from "@/app/components/theme-provider"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// The full site Header (wallet, search, preference controls) is rendered by the
// /actions layout, not the shell; stub it here so the layout test doesn't need the
// web3 provider tree.
vi.mock("@/app/components/header", () => ({
  Header: () => <div data-testid="site-header">site header</div>,
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

  it("renders action shell title, subtitle, close control, and body", async () => {
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
    expect(screen.getByText("Body")).toBeInTheDocument()
    // Chrome (wallet pill, preference controls) now lives in the /actions layout
    // Header, not the shell itself.
    expect(screen.queryByText(/demo-w/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Open help menu")).not.toBeInTheDocument()
  })

  it("the /actions layout renders the full site header (currency/language live there)", () => {
    render(
      <ActionsLayout>
        <div>Action page body</div>
      </ActionsLayout>,
    )

    expect(screen.getByTestId("site-header")).toBeInTheDocument()
    expect(screen.getByText("Action page body")).toBeInTheDocument()
  })

  it("clearly labels simulated sandbox actions", () => {
    renderShell(
      <ActionPageShell title="Borrow" subtitle="Configure and review your loan." simulated>
        <div>Body</div>
      </ActionPageShell>,
    )

    expect(screen.getByText("Sandbox · simulated transaction")).toBeInTheDocument()
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
