"use client"

import * as React from "react"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<TxHistoryRow["kind"], string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  liquidation: "Liquidation",
  rewards: "Rewards",
}

const KIND_TONE: Record<TxHistoryRow["kind"], string> = {
  supply: "text-success",
  withdraw: "text-rose-600 dark:text-rose-400",
  borrow: "text-rose-600 dark:text-rose-400",
  repay: "text-success",
  liquidation: "text-amber-600 dark:text-amber-400",
  rewards: "text-success",
}

type Props = {
  transactions: TxHistoryRow[]
  assetSymbol: string
  title?: string
  subtitle?: string
  kindLabelMap?: Partial<Record<TxHistoryRow["kind"], string>>
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "supply", label: "Supply" },
  { id: "borrow", label: "Borrow" },
  { id: "repay", label: "Repay" },
  { id: "withdraw", label: "Withdraw" },
  { id: "rewards", label: "Rewards" },
] as const

const ROW_HOVER_BG = "transition-colors group-hover:bg-table-header/40 dark:group-hover:bg-[#131820]"
const ROW_HOVER_LEFT = `${ROW_HOVER_BG} group-hover:rounded-l-radius-lg`
const ROW_HOVER_RIGHT = `${ROW_HOVER_BG} group-hover:rounded-r-radius-lg`

function formatRelativeTime(iso: string, locale: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  // `narrow` keeps the compact "5s"/"3h"/"2d" footprint while letting Intl swap
  // in the locale's own unit suffixes (e.g. ja "5秒前", ar "قبل ٥ ثوانٍ").
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" })

  if (totalSeconds < 60) return rtf.format(-totalSeconds, "second")
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return rtf.format(-totalMinutes, "minute")
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return rtf.format(-totalHours, "hour")
  return rtf.format(-Math.floor(totalHours / 24), "day")
}

export function TransactionHistoryCard({
  transactions,
  assetSymbol,
  title = "Transactions",
  subtitle,
  kindLabelMap,
}: Props) {
  const { t, language } = useTranslation()
  const locale = LANGUAGE_HTML_LANG[language] ?? "en"
  const [activeFilter, setActiveFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all")
  const visibleTransactions =
    activeFilter === "all" ? transactions : transactions.filter((tx) => tx.kind === activeFilter)

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{t(title)}</h2>
          {subtitle ? <p className="mt-1 text-[12px] text-muted-foreground">{t(subtitle)}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => {
            const active = filter.id === activeFilter
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
                )}
              >
                {t(filter.label)}
              </button>
            )
          })}
        </div>
      </div>
      <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[96px]" />
                <col className="w-[118px]" />
                <col className="w-[112px]" />
                <col className="w-[132px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Time")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Type")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Amount")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("For")}
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Wallet")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="group transition-colors">
                    <td className={`px-5 py-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground ${ROW_HOVER_LEFT}`}>
                      {tx.timeLabel ?? formatRelativeTime(tx.at, locale)}
                    </td>
                    <td className={`px-3 py-3 align-middle ${ROW_HOVER_BG}`}>
                      <span className={cn("inline-block whitespace-nowrap text-[14px] font-medium tracking-[-0.03em]", KIND_TONE[tx.kind])}>
                        {t(kindLabelMap?.[tx.kind] ?? KIND_LABEL[tx.kind])}
                      </span>
                    </td>
                    <td className={`px-3 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_BG}`}>
                      {tx.amountLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle text-right text-[12px] font-normal tracking-[-0.03em] text-muted-foreground ${ROW_HOVER_BG}`}>
                      <span className="inline-block whitespace-nowrap">{describeTransaction(tx.kind, assetSymbol, t)}</span>
                    </td>
                    <td className={`px-5 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_RIGHT}`}>
                      {tx.walletHref ? (
                        <a
                          href={tx.walletHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block max-w-full truncate whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                        >
                          {tx.walletLabel ?? tx.counterpartyLabel ?? tx.txHashShort}
                        </a>
                      ) : (
                        <span className="inline-block max-w-full truncate whitespace-nowrap align-middle">
                          {tx.walletLabel ?? tx.counterpartyLabel ?? tx.txHashShort}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto md:hidden">
            <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[96px]" />
                <col className="w-[118px]" />
                <col className="w-[112px]" />
                <col className="w-[132px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Time")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Type")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Amount")}
                  </th>
                  <th className="bg-table-header px-3 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("For")}
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                    {t("Wallet")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="group transition-colors">
                    <td className={`px-5 py-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground ${ROW_HOVER_LEFT}`}>
                      {tx.timeLabel ?? formatRelativeTime(tx.at, locale)}
                    </td>
                    <td className={`px-3 py-3 align-middle ${ROW_HOVER_BG}`}>
                      <span className={cn("inline-block whitespace-nowrap text-[14px] font-medium tracking-[-0.03em]", KIND_TONE[tx.kind])}>
                        {t(kindLabelMap?.[tx.kind] ?? KIND_LABEL[tx.kind])}
                      </span>
                    </td>
                    <td className={`px-3 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_BG}`}>
                      {tx.amountLabel}
                    </td>
                    <td className={`px-3 py-3 align-middle text-right text-[12px] font-normal tracking-[-0.03em] text-muted-foreground ${ROW_HOVER_BG}`}>
                      <span className="inline-block whitespace-nowrap">{describeTransaction(tx.kind, assetSymbol, t)}</span>
                    </td>
                    <td className={`px-5 py-3 align-middle text-right font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums text-foreground ${ROW_HOVER_RIGHT}`}>
                      {tx.walletHref ? (
                        <a
                          href={tx.walletHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block max-w-full truncate whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                        >
                          {tx.walletLabel ?? tx.counterpartyLabel ?? tx.txHashShort}
                        </a>
                      ) : (
                        <span className="inline-block max-w-full truncate whitespace-nowrap align-middle">
                          {tx.walletLabel ?? tx.counterpartyLabel ?? tx.txHashShort}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </section>
  )
}

function describeTransaction(kind: TxHistoryRow["kind"], assetSymbol: string, t: (key: string) => string) {
  switch (kind) {
    case "supply":
      return t("{symbol} market").replace("{symbol}", assetSymbol)
    case "withdraw":
      return t("{symbol} market").replace("{symbol}", assetSymbol)
    case "borrow":
      return t("{symbol} debt").replace("{symbol}", assetSymbol)
    case "repay":
      return t("{symbol} debt").replace("{symbol}", assetSymbol)
    case "rewards":
      return t("{symbol} incentives").replace("{symbol}", assetSymbol)
    case "liquidation":
      return t("Liquidator")
    default:
      return assetSymbol
  }
}
