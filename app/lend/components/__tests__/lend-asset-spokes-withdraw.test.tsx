import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LendAssetSpokes } from "@/app/lend/components/lend-asset-spokes"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/app/lib/prices/token-prices-context", () => ({ usePriceFor: () => () => undefined }))

afterEach(cleanup)

describe("LendAssetSpokes withdrawal availability", () => {
  it("disables Withdraw when the wallet has no supplied position", () => {
    const group = LEND_ASSET_GROUPS[0]!
    const rows = group.rows.slice(0, 2)
    const firstRow = rows[0]! as typeof rows[number] & { marketId?: string }
    const withdrawableId = firstRow.marketId ?? firstRow.symbol.toLowerCase()

    render(
      <LendAssetSpokes
        groups={[{ ...group, rows }]}
        onDeposit={vi.fn()}
        withdrawableMarketIds={new Set([withdrawableId])}
      />,
    )

    const buttons = screen.getAllByRole("button", { name: "Withdraw" })
    const enabled = buttons.filter((button) => !button.hasAttribute("disabled"))
    const disabled = buttons.filter((button) => button.hasAttribute("disabled"))
    expect(enabled).toHaveLength(1)
    expect(disabled).toHaveLength(1)
    expect(disabled[0]).toHaveAttribute("title", "No supplied position to withdraw")
  })
})
