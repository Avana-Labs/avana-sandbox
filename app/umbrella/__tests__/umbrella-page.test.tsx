import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { AvanaSessionsProvider } from "@/app/lib/avana-session/avana-sessions-provider"
import { pendingUmbrellaPersistAction } from "@/app/lib/umbrella-system/use-umbrella-session"
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

    expect(screen.getByText("Total position value")).toBeInTheDocument()
    // The "Includes active stake and cooldown" explainer now lives under an (i) tooltip
    // instead of a visible sub-label.
    expect(screen.getByLabelText("More information about Total position value")).toBeInTheDocument()
    // Canonical compact USD is one decimal ($55.0M), shared with the rest of the app
    // (previously the Umbrella-only formatter emitted two decimals, "$55.00M"). The
    // hero market sub-label was removed, so this now anchors on the Total coverage tile.
    expect(screen.getAllByText("$55.0M").length).toBeGreaterThan(0)

    // Asset headings in the positions table
    expect(screen.getAllByText("Stake GHO").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake USDC").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake USDT").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stake WETH").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Stable Hub").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Correlated Hub").length).toBeGreaterThan(0)

    const positions = within(screen.getByRole("region", { name: "Umbrella positions" }))
    expect(positions.getAllByText("Covered reserve").length).toBeGreaterThan(0)

    // APY column renders the total percent (the base + reward split moved to a tooltip
    // to declutter the table).
    expect(screen.getAllByText("6.4%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.84%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("4.19%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5.05%").length).toBeGreaterThan(0)

    // The selected USDC surface exposes its protection layers and APY sources
    // in the sidebar before the aggregate Market Level Risk section.
    expect(screen.getByText("Surface details")).toBeInTheDocument()
    expect(screen.getByText("Stable Hub → USDC Spoke → USDC Reserve")).toBeInTheDocument()
    expect(screen.getByText("Active staker capital")).toBeInTheDocument()
    expect(screen.getByText("$12.0M")).toBeInTheDocument()
    expect(screen.getByText("Coverage ratio")).toBeInTheDocument()
    expect(screen.getByText("120%")).toBeInTheDocument()
    expect(screen.getByText("APY breakdown")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about Local deductible")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about DAO first-loss offset")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about Hub tail target")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about Cooldown queue")).toBeInTheDocument()
  })

  it("shows the 20-day cooldown and 2-day unstake window", () => {
    renderUmbrellaPage()

    expect(screen.getByText("Cooldown: 20 days · Unstake window: 2 days")).toBeInTheDocument()
  })

  it("never renders an Unstake CTA in the positions table (Claim is the only row action)", () => {
    renderUmbrellaPage()

    // Scope to the positions table region — unstaking still lives in the sidebar action rail.
    const positions = within(screen.getByRole("region", { name: "Umbrella positions" }))
    const links = positions.getAllByRole("link")
    // No Unstake row action, even for positions whose cooldown is ready (e.g. seeded USDT).
    expect(links.some((link) => link.getAttribute("href")?.startsWith("/actions/umbrella/unstake"))).toBe(false)
    // Positions with pending rewards still expose a Claim row action.
    expect(links.some((link) => link.getAttribute("href")?.startsWith("/actions/umbrella/claim"))).toBe(true)
  })

  it("exposes the four action tabs in the sidebar rail", () => {
    renderUmbrellaPage()

    const tablist = screen.getByRole("tablist", { name: "Umbrella actions" })
    for (const label of ["Stake", "Claim", "Cooldown", "Unstake"]) {
      expect(within(tablist).getByRole("tab", { name: label })).toBeInTheDocument()
    }
  })

  it("shows a loading skeleton (never demo stakes) while the Convex umbrella snapshot is pending", () => {
    render(
      <DisplayPreferencesProvider>
        <AvanaSessionsProvider
          walletId="umbrella-test-wallet"
          persistLocalState={false}
          persistUmbrellaState={false}
          sessionSource="convex"
          authoritativeWalletPending
          persistUmbrellaAction={pendingUmbrellaPersistAction}
        >
          <UmbrellaPage />
        </AvanaSessionsProvider>
      </DisplayPreferencesProvider>,
    )

    // Single hydration gate: while the umbrella query is pending we render the
    // layout-matched skeleton — never the seeded demo stakes, never a flash of $0
    // tiles or the "no positions" empty state (those are real, hydrated content).
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
    expect(screen.queryByText("$38,544")).not.toBeInTheDocument()
    expect(screen.queryByText("Stake GHO")).not.toBeInTheDocument()
    expect(screen.queryByText("You have no Umbrella positions yet.")).not.toBeInTheDocument()
  })
})
