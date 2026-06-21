import { act, render, screen, waitFor } from "@testing-library/react"
import { useEffect, useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { AvanaSessionsProvider, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { RewardsActionPageClient } from "@/app/components/action-page/rewards-action-page-client"

async function seedRewardsActivity(session: ReturnType<typeof useAvanaSessions>) {
  const borrowMarketId = session.borrow.collateralPools[0]!.id
  const borrowAssetId = session.borrow.getBorrowableAssetsForMarket(borrowMarketId)[0]!.id

  await session.lend.executeTransaction(
    session.lend.createIntent({
      type: "deposit",
      walletId: session.walletId,
      marketId: "gho",
      depositAmount: 200,
      walletBalance: 10_000,
    }),
  )

  await session.lend.executeTransaction(
    session.lend.createIntent({
      type: "deposit",
      walletId: session.walletId,
      marketId: "gho",
      depositAmount: 300,
      walletBalance: 10_000,
    }),
  )

  await session.borrow.executeTransaction(
    session.borrow.createIntent({
      type: "borrow",
      walletId: session.walletId,
      marketId: borrowMarketId,
      assetId: borrowAssetId,
      amountUsd6: parseFixed("200", 6),
      at: Date.now(),
    }),
  )

  await session.multiply.executeTransaction(
    session.multiply.createIntent({
      type: "multiply",
      walletId: session.walletId,
      marketId: "eth-usdt",
      collateralAmount: 300,
      selectedMultiplier: 2,
    }),
  )
}

function RewardsClaimHarness() {
  const session = useAvanaSessions()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await seedRewardsActivity(session)

      await waitFor(async () => {
        const summary = await session.rewards.readAdapter.readRewardSummary(session.walletId)
        expect(summary.totalClaimableAmount).toBeGreaterThan(0)
      })

      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [session])

  if (!ready) return null
  return <RewardsActionPageClient />
}

describe("RewardsActionPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("shows a claimable rewards flow after wallet activity is seeded", async () => {
    render(
      <AvanaSessionsProvider>
        <RewardsClaimHarness />
      </AvanaSessionsProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("action-page-shell")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review" })).toBeEnabled()
    })
  })
})
