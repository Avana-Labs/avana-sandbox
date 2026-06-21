import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PortfolioInvestments } from "@/app/portfolio/portfolio-investments"

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ showDollarAmounts: true }),
}))

describe("PortfolioInvestments", () => {
  it("shows claimable lend rewards and runs the claim action", () => {
    const onClaimRewards = vi.fn()

    render(
      <PortfolioInvestments
        investments={[]}
        rewardsSummary={{ claimableUsd: 64, totalEarnedUsd: 64 }}
        onClaimRewards={onClaimRewards}
        isClaimingRewards={false}
      />,
    )

    expect(screen.getByText("Claimable rewards")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Claim $64.00" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Claim $64.00" }))
    expect(onClaimRewards).toHaveBeenCalledTimes(1)
  })
})
