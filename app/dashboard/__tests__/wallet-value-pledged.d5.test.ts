import { describe, expect, it } from "vitest"
import { sumWalletValueUsd } from "@/app/dashboard/dashboard-wallet-tab"

describe("Wallet Value excludes pledged collateral (D5)", () => {
  it("does not count 'Pledged collateral' rows (already committed to a borrow position)", () => {
    const rows = [
      { valueUsd: 1693.4, sourceLabel: "Wallet" },
      { valueUsd: 615.8, sourceLabel: "Borrow collateral" },
      { valueUsd: 384.2, sourceLabel: "Pledged collateral" },
    ]
    // Was $2,693.40 (included the $384.20 pledged); now $2,309.20.
    expect(sumWalletValueUsd(rows)).toBeCloseTo(2309.2, 2)
  })

  it("counts everything when nothing is pledged", () => {
    const rows = [
      { valueUsd: 100, sourceLabel: "Wallet" },
      { valueUsd: 50, sourceLabel: "Borrow collateral" },
    ]
    expect(sumWalletValueUsd(rows)).toBe(150)
  })
})
