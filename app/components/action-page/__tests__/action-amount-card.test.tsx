import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionAmountCard } from "@/app/components/action-page/action-amount-card"

vi.mock("@/app/lib/use-media-query", () => ({
  useMediaQuery: vi.fn(() => false),
}))

import { useMediaQuery } from "@/app/lib/use-media-query"

afterEach(() => {
  cleanup()
  vi.mocked(useMediaQuery).mockReturnValue(false)
})

const baseProps = {
  label: "Deposit",
  amount: "",
  onAmountChange: () => {},
  approxUsdLabel: "≈ $0.00",
  assetLabel: "ETH",
  assetSymbol: "ETH",
  balanceLabel: "Balance",
  balanceValue: "1.28",
}

describe("ActionAmountCard", () => {
  it("does not prefill the amount input", () => {
    render(<ActionAmountCard {...baseProps} />)
    const input = screen.getByLabelText("Deposit amount") as HTMLInputElement
    expect(input.value).toBe("")
  })

  it("renders a non-interactive pill (no dropdown) when not switchable", () => {
    const { container } = render(<ActionAmountCard {...baseProps} />)
    expect(screen.queryByRole("listbox")).toBeNull()
    // No chevron / haspopup affordance when there's nothing to switch to.
    expect(container.querySelector('[aria-haspopup="listbox"]')).toBeNull()
  })

  it("opens a switcher and changes asset when options are provided", () => {
    const onAssetSelect = vi.fn()
    render(
      <ActionAmountCard
        {...baseProps}
        selectedAssetId="eth"
        onAssetSelect={onAssetSelect}
        assetOptions={[
          { id: "eth", label: "Ethereum", symbol: "ETH" },
          { id: "usdc", label: "USD Coin", symbol: "USDC" },
          { id: "wbtc", label: "Wrapped BTC", symbol: "WBTC" },
        ]}
      />,
    )

    const trigger = screen.getByRole("button", { name: /change asset/i })
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox")
    fireEvent.click(trigger)

    expect(screen.getByRole("listbox")).toBeTruthy()
    fireEvent.click(screen.getByRole("option", { name: /USD Coin/i }))
    expect(onAssetSelect).toHaveBeenCalledWith("usdc")
    // Menu closes after selection.
    expect(screen.queryByRole("listbox")).toBeNull()
  })

  it("shows a custom keypad on mobile instead of the native keyboard", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true)
    const onAmountChange = vi.fn()
    render(<ActionAmountCard {...baseProps} onAmountChange={onAmountChange} />)

    const input = screen.getByLabelText("Deposit amount") as HTMLInputElement
    expect(input.readOnly).toBe(true)
    expect(screen.getByTestId("action-numeric-keypad")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "7" }))
    expect(onAmountChange).toHaveBeenCalledWith("7")
  })
})
