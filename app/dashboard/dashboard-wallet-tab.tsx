"use client"

import Link from "next/link"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import { primaryCtaClass, SECONDARY_CTA_CLASS } from "@/app/components/action-page/action-cta"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { buildDashboardWalletBalanceRows, type DashboardWalletBalanceRow } from "@/app/lib/swap-system"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const WALLET_RETURN_HREF = "/dashboard?tab=wallet"

function swapHref(row?: DashboardWalletBalanceRow) {
  const params = new URLSearchParams({
    origin: "wallet",
    return: WALLET_RETURN_HREF,
  })
  if (row?.swappable) params.set("from", row.assetId)
  return `/swap?${params.toString()}`
}

function restrictionCopy(row: DashboardWalletBalanceRow, t: (key: string) => string) {
  if (row.swappable) return t("Available")
  if (row.restrictionReason === "ineligible_lp_token") return t("LP tokens are not swappable")
  if (row.restrictionReason === "insufficient_balance") return t("No available balance")
  return t("Unavailable")
}

export function DashboardWalletTab({ walletId }: { walletId: string }) {
  const { exact } = useCurrency()
  const { t } = useTranslation()
  const rows = buildDashboardWalletBalanceRows({ walletId })
  const tokens = rows.filter((row) => !row.isLpToken)
  const lps = rows.filter((row) => row.isLpToken)
  const totalWalletUsd = rows.reduce((total, row) => total + row.valueUsd, 0)

  return (
    <section id="dashboard-wallet" className="space-y-6" aria-label={t("Wallet balances")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">{t("Wallet")}</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
            {t("Wallet-held tokens and LPs available outside Avana positions.")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {t("Wallet value")}
          </div>
          <div className="font-data text-[24px] font-semibold tabular-nums text-foreground">
            {exact(totalWalletUsd)}
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <Link href={swapHref()} className={primaryCtaClass({ size: "compact", className: "min-w-[144px]" })}>
          {t("Swap")}
        </Link>
      </div>

      <WalletBalanceSection title={t("Tokens")} rows={tokens} exact={exact} t={t} />
      <WalletBalanceSection title={t("LPs")} rows={lps} exact={exact} t={t} />
    </section>
  )
}

function WalletBalanceSection({
  title,
  rows,
  exact,
  t,
}: {
  title: string
  rows: DashboardWalletBalanceRow[]
  exact: (usd: number) => string
  t: (key: string) => string
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-4 text-[16px] font-semibold tracking-tight text-foreground md:text-[17px]">{title}</h3>

      <DesktopTableSurface className="hidden md:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5">{t("Asset")}</th>
              <th className="bg-table-header px-5 py-3.5 text-right">{t("Balance")}</th>
              <th className="bg-table-header px-5 py-3.5 text-right">{t("Value")}</th>
              <th className="bg-table-header px-5 py-3.5">{t("Status")}</th>
              <th className="rounded-r-radius-lg bg-table-header px-5 py-3.5 text-right">{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td className={`px-5 py-4 align-middle ${TABLE_ROW_HOVER_LEFT}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={row.symbol} size="table" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{row.name}</div>
                      <div className="text-[13px] text-muted-foreground">{row.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className={`px-5 py-4 text-right font-data tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {row.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </td>
                <td className={`px-5 py-4 text-right font-data tabular-nums text-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {exact(row.valueUsd)}
                </td>
                <td className={`px-5 py-4 text-[13px] text-muted-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {restrictionCopy(row, t)}
                </td>
                <td className={`px-5 py-4 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                  <HoverActionGroup>
                    {row.swappable ? (
                      <Link href={swapHref(row)} className={primaryCtaClass({ size: "compact" })}>
                        {t("Swap")}
                      </Link>
                    ) : (
                      <span className={SECONDARY_CTA_CLASS} aria-disabled="true">
                        {t("View")}
                      </span>
                    )}
                  </HoverActionGroup>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[14px] text-muted-foreground">
                  {t("No wallet balances found.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DesktopTableSurface>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-radius-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <TokenIcon symbol={row.symbol} size="md" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{row.name}</div>
                  <div className="text-[13px] text-muted-foreground">{row.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-data text-[15px] font-medium tabular-nums text-foreground">
                  {row.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
                <div className="font-data text-[12.5px] tabular-nums text-muted-foreground">{exact(row.valueUsd)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[13px] text-muted-foreground">{restrictionCopy(row, t)}</span>
              {row.swappable ? (
                <Link href={swapHref(row)} className={primaryCtaClass({ size: "compact" })}>
                  {t("Swap")}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="rounded-radius-lg border border-border bg-card p-5 text-center text-[14px] text-muted-foreground">
            {t("No wallet balances found.")}
          </div>
        ) : null}
      </div>
    </section>
  )
}
