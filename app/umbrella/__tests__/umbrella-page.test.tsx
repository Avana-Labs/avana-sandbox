import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now() + 100000), 0) as unknown as number,
  )
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>))
})

afterEach(() => {
  cleanup()
})

describe("Umbrella page", () => {
  it("renders each seeded market with its APY breakdown", async () => {
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
    expect(screen.getAllByText("Surface details")).toHaveLength(1)
    expect(screen.getByText("Stable Hub → USDC Spoke → USDC Reserve")).toBeInTheDocument()
    expect(screen.getByText("Active staker capital")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText("$12.0M").length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText("Coverage ratio")).toBeInTheDocument()
      expect(screen.getAllByText("120%").length).toBeGreaterThanOrEqual(2)
    })
    // The action page keeps secondary details hidden until an amount is entered;
    // the large main-page Surface details section does not include APY breakdown.
    expect(screen.queryByText("APY breakdown")).not.toBeInTheDocument()
    expect(screen.getByLabelText("More information about Local deductible")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about DAO first-loss offset")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about Hub tail target")).toBeInTheDocument()
    expect(screen.getByLabelText("More information about Cooldown queue")).toBeInTheDocument()
  })

  it("shows the 20-day cooldown and 2-day unstake window", () => {
    renderUmbrellaPage()

    expect(screen.getByText("Cooldown: 20 days · Unstake window: 2 days")).toBeInTheDocument()
  })

  it("reveals secondary action details after an amount is entered", () => {
    renderUmbrellaPage()

    expect(screen.queryByText("APY breakdown")).not.toBeInTheDocument()
    expect(screen.queryByText("Slashable stake")).not.toBeInTheDocument()
    expect(screen.queryByText("Network fee")).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole("textbox", { name: /amount/i }), { target: { value: "1000" } })

    expect(screen.getByText("APY breakdown")).toBeInTheDocument()
    expect(screen.getByText("Slashable stake")).toBeInTheDocument()
    expect(screen.getByText("Network fee")).toBeInTheDocument()
  })

  it("places cooldown immediately after positions and before market-level risk", () => {
    renderUmbrellaPage()

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent)
    const positionsIndex = headings.indexOf("Umbrella positions")
    const cooldownIndex = headings.indexOf("Umbrella Cooldown")
    const marketRiskIndex = headings.indexOf("Market Level Risk")

    expect(cooldownIndex).toBe(positionsIndex + 1)
    expect(marketRiskIndex).toBe(cooldownIndex + 1)
  })

  it("uses independent surface tabs for the large Surface details section", () => {
    renderUmbrellaPage()

    const surfaceTabs = screen.getByRole("tablist", { name: "Umbrella surface details" })
    expect(within(surfaceTabs).getAllByRole("tab")).toHaveLength(4)
    expect(within(surfaceTabs).getByRole("tab", { name: "View USDC surface details" })).toHaveAttribute(
      "aria-selected",
      "true",
    )

    fireEvent.click(within(surfaceTabs).getByRole("tab", { name: "View WETH surface details" }))

    expect(screen.getByText("Correlated Hub → WETH Spoke → WETH Reserve")).toBeInTheDocument()
    expect(within(surfaceTabs).getByRole("tab", { name: "View WETH surface details" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
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
