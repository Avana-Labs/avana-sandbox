"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { mapLendHistoryToDetailRows } from "@/app/lib/lend-system/read-model"
import { actionPagePath } from "@/app/lib/action-system/contracts"

export function LendMarketDetailClient({ marketId }: { marketId: string }) {
  const router = useRouter()
  const lendSession = useLendSessionContext()
  const market = lendSession.state.markets[marketId] ?? getLendMarketById(marketId)

  const position = useMemo(
    () =>
      Object.values(lendSession.state.positions).find(
        (entry) => entry.walletId === lendSession.walletId && entry.marketId === marketId && entry.status === "active",
      ),
    [lendSession.state.positions, lendSession.walletId, marketId],
  )

  const history = useMemo(
    () =>
      mapLendHistoryToDetailRows(
        lendSession.transactionHistory.filter((item) => item.marketId === marketId),
        market?.asset.symbol ?? "",
      ),
    [lendSession.transactionHistory, market?.asset.symbol, marketId],
  )

  if (!market) return null

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-medium">{market.asset.name}</h1>
      <p className="mt-1 text-muted-foreground">{market.asset.symbol} supply market</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Metric label="Supply APY" value={`${(market.supplyApy * 100).toFixed(2)}%`} />
        <Metric label="Rewards APY" value={`${(market.rewardsApy * 100).toFixed(2)}%`} />
        <Metric label="Total APY" value={`${(market.totalApy * 100).toFixed(2)}%`} />
        <Metric label="Utilization" value={`${(market.utilization * 100).toFixed(2)}%`} />
        <Metric label="Reserve factor" value={`${(market.reserveFactor * 100).toFixed(2)}%`} />
        <Metric label="Status" value={market.status} />
        <Metric label="Available liquidity" value={market.availableLiquidity.toLocaleString()} />
        <Metric label="Supplied" value={position?.currentSuppliedAmount.toFixed(4) ?? "0"} />
        <Metric label="Interest earned" value={position?.interestEarned.toFixed(4) ?? "0"} />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => router.push(actionPagePath("lend", "deposit", { market: marketId }))}
        >
          Deposit
        </button>
        {position ? (
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm"
            onClick={() => router.push(actionPagePath("lend", "withdraw", { market: marketId }))}
          >
            Withdraw
          </button>
        ) : null}
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">History</h2>
        {history.length ? (
          history.map((row) => (
            <div key={row.id} className="rounded-md border border-border px-4 py-3 text-sm">
              <div className="font-medium capitalize">{row.kind}</div>
              <div className="text-muted-foreground">{row.amountLabel}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No lend activity yet.</p>
        )}
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-medium capitalize">{value}</div>
    </div>
  )
}
