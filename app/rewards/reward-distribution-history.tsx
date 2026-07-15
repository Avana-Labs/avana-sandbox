"use client"

import * as React from "react"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const MASK = "••••"
const COLLAPSED_COUNT = 5

const STATUS_LABEL: Record<PortfolioActivityRow["status"], string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  failed: "Failed",
}

const STATUS_TONE: Record<PortfolioActivityRow["status"], string> = {
  confirmed: "border-emerald-500/20 bg-emerald-500/10 text-success",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

function formatSignedAva(amount: number) {
  const formatted = `${Math.abs(amount).toLocaleString()} AVA`
  return amount > 0 ? `+${formatted}` : amount < 0 ? `-${formatted}` : formatted
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`
}

// A canonical on-chain tx hash is 0x + 64 hex chars. Sandbox/simulated claim
// hashes don't match, so they link to the in-app sandbox receipt page.
const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/

function getTxnHref(txHash: string) {
  return REAL_TX_HASH.test(txHash)
    ? `https://etherscan.io/tx/${txHash}`
    : `/sandbox/transactions/${encodeURIComponent(txHash)}`
}

function TxnLink({ txHash, className }: { txHash: string; className?: string }) {
  const external = REAL_TX_HASH.test(txHash)
  return (
    <a href={getTxnHref(txHash)} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className={className}>
      {shortHash(txHash)}
    </a>
  )
}

function formatRelativeTime(iso: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

/**
 * Reward Distribution History — the claim ledger for AVA rewards. These rows used
 * to be folded into the dashboard's combined activity table; they now live on the
 * rewards page where the claim action does.
 */
export function RewardDistributionHistory({ rows }: { rows: PortfolioActivityRow[] }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const [showAll, setShowAll] = React.useState(false)

  const sorted = React.useMemo(
    () => [...rows].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [rows],
  )
  const displayItems = showAll ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const hasMore = sorted.length > COLLAPSED_COUNT
  const amount = (row: PortfolioActivityRow) => (showDollarAmounts ? formatSignedAva(row.amountUsd) : MASK)
  const statusLabel = (row: PortfolioActivityRow) => t(STATUS_LABEL[row.status])

  return (
    <section className="mt-12 min-w-0 md:mt-16">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">
          {t("Reward Distribution History")}
        </h2>
        {hasMore ? (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="shrink-0 text-[13px] font-medium text-brand transition-colors hover:text-brand/80"
          >
            {showAll ? t("Show less") : t("View all")}
          </button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("No rewards claimed yet — complete quests to start earning AVA.")}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-2 md:hidden">
            {displayItems.map((row) => (
              <div key={row.id} className="rounded-radius-lg border border-border bg-card p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[14px] font-medium text-foreground">{row.primaryLabel}</span>
                  <span className="shrink-0 font-data text-[12.5px] tabular-nums text-muted-foreground">
                    {formatRelativeTime(row.at)}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{row.secondaryLabel}</div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <span className="font-data text-[14px] font-medium tabular-nums text-success">{amount(row)}</span>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[row.status])}>
                      {statusLabel(row)}
                    </span>
                    <TxnLink
                      txHash={row.txHash}
                      className="font-data text-[12px] tabular-nums text-muted-foreground underline-offset-2 hover:underline"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-[14px]">
              <colgroup>
                <col className="w-[80px]" />
                <col />
                <col className="w-[132px]" />
                <col className="w-[120px]" />
                <col className="w-[132px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5">{t("Time")}</th>
                  <th className="bg-table-header px-5 py-3.5">{t("Quest")}</th>
                  <th className="bg-table-header px-5 py-3.5">{t("Amount")}</th>
                  <th className="bg-table-header px-5 py-3.5">{t("Status")}</th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right">{t("Txn")}</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-hover">
                    <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">
                      {formatRelativeTime(row.at)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">{row.primaryLabel}</div>
                        <div className="truncate text-[12px] text-muted-foreground">{row.secondaryLabel}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle font-data text-[14px] font-medium tabular-nums text-success">
                      {amount(row)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium", STATUS_TONE[row.status])}>
                        {statusLabel(row)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right font-data text-[13px] tabular-nums text-foreground">
                      <TxnLink
                        txHash={row.txHash}
                        className="inline-block whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
