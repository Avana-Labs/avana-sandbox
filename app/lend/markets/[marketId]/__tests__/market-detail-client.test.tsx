import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LendMarketDetailClient } from "@/app/lend/markets/[marketId]/market-detail-client"
import { getLendMarketDetail } from "@/app/lib/lend-detail"

// Passthrough translator so the breadcrumb renders its English source label
// without needing a DisplayPreferencesProvider.
vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key, language: "EN" }),
}))

// The rich detail sections (charts, embedded action forms) are exercised in the
// browser; here we stub them so we can assert the CLIENT wires the right data
// into each section from a real Convex/mock-shaped LendMarketDetail.
vi.mock("@/app/lend/_detail", () => ({
  LendHero: () => <div data-testid="lend-hero" />,
  LendHeroIdentity: ({ detail }: { detail: { hero: { name: string } } }) => (
    <div data-testid="lend-hero-identity">{detail.hero.name}</div>
  ),
  SupplyCard: () => <div data-testid="supply-card" />,
  RelatedMarketsRow: ({ detail }: { detail: { related: unknown[] } }) => (
    <div data-testid="related">{detail.related.length}</div>
  ),
  LendSidebar: () => <div data-testid="lend-sidebar" />,
}))
vi.mock("@/app/borrow/_detail/ui", () => ({
  AboutNewsSection: () => <div data-testid="about" />,
  EngagementTrendsCard: () => <div data-testid="engagement" />,
  DetailFaqSection: ({ items }: { items: unknown[] }) => <div data-testid="faqs">{items.length}</div>,
}))
vi.mock("@/app/borrow/_detail/pool-sections", () => ({
  CashflowCard: () => <div data-testid="cashflow" />,
  QuickStatsGrid: ({ detail }: { detail: { quickStats: unknown[] } }) => (
    <div data-testid="quickstats">{detail.quickStats.length}</div>
  ),
  RiskSection: () => <div data-testid="risk" />,
}))
vi.mock("@/app/borrow/_detail/asset-sections", () => ({
  TransactionHistoryCard: ({ transactions, assetSymbol }: { transactions: unknown[]; assetSymbol: string }) => (
    <div data-testid="transactions">{`${assetSymbol}:${transactions.length}`}</div>
  ),
}))
vi.mock("@/app/lib/lend-system/lend-session-context", () => ({
  useLendSessionContext: () => ({ walletId: "demo-wallet", transactionHistory: [] }),
}))

describe("LendMarketDetailClient", () => {
  afterEach(cleanup)

  it("composes the rich sections from a LendMarketDetail", () => {
    const detail = getLendMarketDetail("usdc")!
    render(<LendMarketDetailClient detail={detail} />)

    // Breadcrumb back to the lend list.
    expect(screen.getByRole("link", { name: "Lend" })).toHaveAttribute("href", "/lend")
    // Identity + every analytics section is wired.
    expect(screen.getByTestId("lend-hero-identity")).toHaveTextContent(detail.hero.name)
    expect(screen.getByTestId("lend-hero")).toBeInTheDocument()
    expect(screen.getByTestId("quickstats")).toHaveTextContent(String(detail.quickStats.length))
    expect(screen.getByTestId("supply-card")).toBeInTheDocument()
    expect(screen.getByTestId("cashflow")).toBeInTheDocument()
    expect(screen.getByTestId("engagement")).toBeInTheDocument()
    expect(screen.getByTestId("risk")).toBeInTheDocument()
    expect(screen.getByTestId("faqs")).toHaveTextContent(String(detail.faqs.length))
    expect(screen.getByTestId("transactions")).toHaveTextContent(`USDC:${detail.transactions.length}`)
    expect(screen.getByTestId("related")).toHaveTextContent(String(detail.related.length))
    // Sidebar renders (desktop + mobile dock → 2 instances).
    expect(screen.getAllByTestId("lend-sidebar").length).toBeGreaterThanOrEqual(1)
  })
})
