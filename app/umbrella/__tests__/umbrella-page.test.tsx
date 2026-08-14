import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import UmbrellaPage from "@/app/umbrella/page"

function renderUmbrellaPage() {
  return render(
    <DisplayPreferencesProvider>
      <AvanaSessionsProvider walletId="umbrella-test-wallet" persistLocalState={false}>
        <UmbrellaPage />
      </AvanaSessionsProvider>
    </DisplayPreferencesProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe("Umbrella page", () => {
  it("renders the final stake markets with Stake and Unstake actions", () => {
    renderUmbrellaPage()

    expect(screen.getByText("Your Umbrella stake")).toBeInTheDocument()
    expect(screen.getAllByText("$55.00M").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake GHO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$25.00M").length).toBeGreaterThan(0)
    expect(screen.getAllByText("6.4%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake USDC").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$12.00M").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.84%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake USDT").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$11.00M").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.19%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake WETH").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$7.00M").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5.05%").length).toBeGreaterThan(0)

    expect(screen.getAllByRole("button", { name: /Stake/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Unstake/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole("tab", { name: /Claim/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Cooldown/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Supply/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Withdraw/i })).not.toBeInTheDocument()
  })

  it("stakes from the connected Umbrella wallet balance", () => {
    renderUmbrellaPage()

    fireEvent.change(screen.getAllByLabelText("Stake amount")[0]!, { target: { value: "10000" } })
    fireEvent.click(screen.getAllByRole("button", { name: /^Stake$/i })[0]!)

    expect(screen.getAllByText("$55.01M").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$19,500.00").length).toBeGreaterThan(0)
    expect(screen.getByText("Umbrella activity")).toBeInTheDocument()
    expect(screen.getAllByText("Stake").length).toBeGreaterThan(0)
    expect(screen.getAllByText("+10,000 GHO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Sandbox wallet").length).toBeGreaterThan(0)
  })
})
