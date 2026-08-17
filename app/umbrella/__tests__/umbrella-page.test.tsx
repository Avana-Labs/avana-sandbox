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
  it("renders each seeded market with its APY breakdown", () => {
    renderUmbrellaPage()

    expect(screen.getByText("Your Umbrella stake")).toBeInTheDocument()
    // Canonical compact USD is one decimal ($55.0M), shared with the rest of the app
    // (previously the Umbrella-only formatter emitted two decimals, "$55.00M").
    expect(screen.getAllByText("$55.0M market").length).toBeGreaterThan(0)

    // Asset headings in the positions table
    expect(screen.getAllByText("Stake GHO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake USDC").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake USDT").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake WETH").length).toBeGreaterThan(0)

    // APY column renders the total percent (the base + reward split moved to a tooltip
    // to declutter the table).
    expect(screen.getAllByText("6.4%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.84%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.19%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5.05%").length).toBeGreaterThan(0)
  })

  it("shows status labels including cooldown states", () => {
    renderUmbrellaPage()

    expect(screen.getAllByText("Earning").length).toBeGreaterThan(0)
    expect(screen.getAllByText("In cooldown").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Withdrawal ready").length).toBeGreaterThan(0)
  })

  it("only routes Unstake links for positions whose cooldown is ready", () => {
    renderUmbrellaPage()

    const unstakeLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/actions/umbrella/unstake"))
    const hrefs = unstakeLinks.map((link) => link.getAttribute("href")).filter(Boolean) as string[]

    // USDT is seeded with cooldownStatus === "ready", so its Unstake CTA renders.
    expect(hrefs.some((href) => href.includes("market=usdt"))).toBe(true)
    // Idle positions (GHO, WETH) never render an Unstake row action anymore.
    expect(hrefs.some((href) => href.includes("market=gho") && !href.includes("cooldown"))).toBe(false)
  })

  it("exposes the four action tabs in the sidebar rail", () => {
    renderUmbrellaPage()

    const tablist = screen.getByRole("tablist", { name: "Umbrella actions" })
    for (const label of ["Stake", "Claim", "Cooldown", "Unstake"]) {
      expect(within(tablist).getByRole("tab", { name: label })).toBeInTheDocument()
    }
  })
})
