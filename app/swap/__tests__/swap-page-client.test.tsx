import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SwapPageClient } from "@/app/swap/swap-page-client"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@/app/lib/currency/use-currency", () => ({
  useCurrency: () => ({ exact: (value: number) => `$${value.toFixed(2)}` }),
}))

afterEach(() => cleanup())

function renderSwap() {
  return render(
    <AvanaSessionsProvider walletId="demo-wallet" persistLocalState={false}>
      <SwapPageClient initialFrom="eth" initialTo="usdc" />
    </AvanaSessionsProvider>,
  )
}

describe("SwapPageClient", () => {
  it("renders the canonical swap page", () => {
    renderSwap()

    expect(screen.getByRole("heading", { name: "Swap" })).toBeInTheDocument()
    expect(screen.getByLabelText("Sell")).toBeInTheDocument()
    expect(screen.getByLabelText("Receive at least")).toBeInTheDocument()
  })

  it("quotes a wallet swap after amount entry", async () => {
    renderSwap()

    fireEvent.change(screen.getAllByLabelText("Sell")[0]!, { target: { value: "0.001" } })

    await waitFor(() => {
      expect(screen.getByText(/1 ETH =/)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Review swap" })).toBeEnabled()
  })

  it("searches supported assets in the receive picker", () => {
    renderSwap()

    fireEvent.click(screen.getByRole("button", { name: "Receive at least asset" }))
    fireEvent.change(screen.getByLabelText("Find an asset"), { target: { value: "chain" } })
    fireEvent.click(screen.getByText("ChainLink Token").closest("button")!)

    expect(screen.getByRole("button", { name: "Receive at least asset" })).toHaveTextContent("LINK")
  })

  it("opens review and confirms native swaps", async () => {
    renderSwap()

    fireEvent.change(screen.getAllByLabelText("Sell")[0]!, { target: { value: "0.001" } })
    await waitFor(() => expect(screen.getByRole("button", { name: "Review swap" })).toBeEnabled())

    fireEvent.click(screen.getByRole("button", { name: "Review swap" }))
    expect(screen.getByRole("heading", { name: "Review swap" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Swap" }))
    await waitFor(() => {
      expect(screen.getByText("Swap successful.")).toBeInTheDocument()
    })
  })
})
