import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DetailTransactionTable } from "@/app/components/detail-transaction-table/DetailTransactionTable"
import { BORROW_POOL_KIND_CONFIG, LEND_KIND_CONFIG } from "@/app/components/detail-transaction-table/kind-configs"

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "EN",
  }),
}))

describe("DetailTransactionTable", () => {
  afterEach(cleanup)

  it("renders title without filter pills", () => {
    render(<DetailTransactionTable transactions={[]} kindConfig={LEND_KIND_CONFIG} context={{ assetSymbol: "USDC" }} />)
    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })

  it("renders For (crypto) and USD (fiat) in separate columns", () => {
    render(
      <DetailTransactionTable
        transactions={[
          {
            id: "1",
            at: new Date().toISOString(),
            kind: "supply",
            amountLabel: "$1.2K",
            tokenAmountLabel: "1,200",
            tokenSymbol: "USDC",
            txHashShort: "0xabc",
            walletLabel: "0x1234…5678",
          },
        ]}
        kindConfig={LEND_KIND_CONFIG}
        context={{ assetSymbol: "USDC" }}
      />,
    )
    expect(screen.getByText("For")).toBeInTheDocument()
    expect(screen.getByText("USD")).toBeInTheDocument()
    expect(screen.getByText("1,200 USDC")).toBeInTheDocument()
    expect(screen.getByText("$1.2K")).toBeInTheDocument()
    expect(screen.getAllByRole("img", { name: "USDC" }).length).toBeGreaterThanOrEqual(1)
  })

  it("renders split pool token columns with icons", () => {
    render(
      <DetailTransactionTable
        preset="pool"
        transactions={[
          {
            id: "1",
            at: new Date().toISOString(),
            kind: "supply",
            amountLabel: "$48.53K",
            token0AmountLabel: "10.1831",
            token1AmountLabel: "24,271.21",
            tokenSymbol: "WETH",
            tokenSymbolSecondary: "USDT",
            txHashShort: "0xabc",
            walletLabel: "0x1234…5678",
          },
        ]}
        kindConfig={BORROW_POOL_KIND_CONFIG}
        context={{ token0Symbol: "WETH", token1Symbol: "USDT" }}
      />,
    )
    expect(screen.getByText("WETH")).toBeInTheDocument()
    expect(screen.getByText("USDT")).toBeInTheDocument()
    expect(screen.getByText("10.1831")).toBeInTheDocument()
    expect(screen.getByText("24,271.21")).toBeInTheDocument()
    expect(screen.getAllByRole("img", { name: "WETH" }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole("img", { name: "USDT" }).length).toBeGreaterThanOrEqual(1)
  })

  it("shows empty state when no rows", () => {
    render(<DetailTransactionTable transactions={[]} kindConfig={LEND_KIND_CONFIG} />)
    expect(screen.getByText("No transactions yet")).toBeInTheDocument()
  })
})
