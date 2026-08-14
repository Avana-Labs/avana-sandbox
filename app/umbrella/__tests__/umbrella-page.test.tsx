import { cleanup, render, screen, within } from "@testing-library/react"
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
  it("renders each seeded market with its stake and APY", () => {
    renderUmbrellaPage()

    expect(screen.getByText("Your Umbrella stake")).toBeInTheDocument()
    expect(screen.getAllByText("$55.00M market").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake GHO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$9,500.00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("6.4%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake USDC").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$12,000.00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.84%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake USDT").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$11,000.00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.19%").length).toBeGreaterThan(0)

    expect(screen.getAllByText("Stake WETH").length).toBeGreaterThan(0)
    expect(screen.getAllByText("$7,000.00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5.05%").length).toBeGreaterThan(0)
  })

  it("routes each row's Unstake action to /actions/umbrella/unstake with the market slug", () => {
    renderUmbrellaPage()

    const unstakeLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/actions/umbrella/unstake"))
    const hrefs = unstakeLinks.map((link) => link.getAttribute("href"))

    for (const slug of ["gho", "usdc", "usdt", "weth"]) {
      expect(hrefs.some((href) => href?.includes(`market=${slug}`))).toBe(true)
    }
  })

  it("exposes the four action tabs in the sidebar rail", () => {
    renderUmbrellaPage()

    const tablist = screen.getByRole("tablist", { name: "Umbrella actions" })
    for (const label of ["Stake", "Claim", "Cooldown", "Unstake"]) {
      expect(within(tablist).getByRole("tab", { name: label })).toBeInTheDocument()
    }
  })
})
