import { describe, expect, it } from "vitest"
import {
  enrichBorrowRowWithAsset,
  enrichDetailTransactionRow,
  enrichPoolRowWithPair,
  formatRelativeTime,
  mapBorrowSessionRows,
  mapLendSessionRows,
  mergeTransactionRows,
} from "@/app/lib/detail-page/transaction-history"

describe("transaction-history helpers", () => {
  it("formatRelativeTime returns compact labels", () => {
    const now = Date.now()
    expect(formatRelativeTime(new Date(now - 32_000).toISOString())).toMatch(/32s|32 sec/)
  })

  it("mergeTransactionRows dedupes by id with session first", () => {
    const merged = mergeTransactionRows(
      [{ id: "a", at: "", kind: "supply", amountLabel: "$1", txHashShort: "0x" }],
      [{ id: "a", at: "", kind: "borrow", amountLabel: "$2", txHashShort: "0x" }],
      [{ id: "b", at: "", kind: "repay", amountLabel: "$3", txHashShort: "0x" }],
    )
    expect(merged).toHaveLength(2)
    expect(merged[0]?.amountLabel).toBe("$1")
  })

  it("mapLendSessionRows includes token symbol for icons", () => {
    const rows = mapLendSessionRows(
      [
        {
          id: "l1",
          marketId: "gho",
          kind: "deposit",
          amount: 1200,
          timestamp: Date.now() - 60_000,
          hash: "0xabc1234567890",
        } as never,
      ],
      "gho",
      "GHO",
    )
    expect(rows[0]?.tokenSymbol).toBe("GHO")
    expect(rows[0]?.tokenAmountLabel).toBe("1200.0000")
  })

  it("mapBorrowSessionRows maps borrow actions with token symbol", () => {
    const rows = mapBorrowSessionRows(
      [
        {
          id: "b1",
          marketId: "uni-v2:usdc",
          assetId: "uni-v2:usdc",
          kind: "borrow",
          executedAmountUsd6: 1_500_000_000n,
          timestamp: Date.now() - 120_000,
          hash: "0xdef1234567890",
        } as never,
      ],
      "uni-v2:usdc",
      "USDC",
    )
    expect(rows[0]?.kind).toBe("borrow")
    expect(rows[0]?.tokenSymbol).toBe("USDC")
  })

  it("enrichBorrowRowWithAsset adds symbol when missing", () => {
    const row = enrichBorrowRowWithAsset(
      { id: "1", at: "", kind: "supply", amountLabel: "+$1.2K", txHashShort: "0x" },
      "USDC",
      "supply",
    )
    expect(row.tokenSymbol).toBe("USDC")
  })

  it("enrichPoolRowWithPair adds paired token symbols", () => {
    const row = enrichPoolRowWithPair(
      { id: "1", at: "", kind: "supply", amountLabel: "$50K", txHashShort: "0x" },
      "WETH",
      "USDC",
      "12.4",
      "42.8K",
    )
    expect(row.tokenSymbol).toBe("WETH")
    expect(row.tokenSymbolSecondary).toBe("USDC")
    expect(row.tokenAmountLabel).toContain("/")
  })

  it("enrichDetailTransactionRow fills token icon fields from convex rows missing symbols", () => {
    const row = enrichDetailTransactionRow(
      { id: "1", at: "", kind: "supply", amountLabel: "+$8.00K", txHashShort: "0x" },
      { assetSymbol: "USDC" },
    )
    expect(row.tokenSymbol).toBe("USDC")
    expect(row.tokenAmountLabel).toBe("8.00K")
  })
})
