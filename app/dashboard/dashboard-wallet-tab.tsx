"use client"

import { TokenPairCell } from "@/app/borrow/components/atoms"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { getTokenIconMeta } from "@/app/lib/token-icons"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { buildDashboardWalletBalanceRows, type DashboardWalletBalanceRow } from "@/app/lib/swap-system"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { BorrowAssetVisual } from "@/app/lib/data/borrow-domain"

const DASH = "\u2014"
const MASK = "••••"

const TOKEN_PNL_BASIS_MULTIPLIER: Record<string, number> = {
  eth: 1.08,
  usdc: 1,
  link: 0.94,
  gho: 1,
  wbtc: 0.97,
  aave: 1.03,
}

const LP_UI_DETAILS: Record<string, { feesUsd: number; status: "in_range" | "out_of_range" | "inactive" }> = {
  "eth-usdc-lp": { feesUsd: 0.564, status: "in_range" },
}

function sectionCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatAssetAmount(amount: number, symbol: string) {
  const maximumFractionDigits = amount >= 100 ? 2 : amount >= 1 ? 3 : 4
  return `${amount.toLocaleString(undefined, { maximumFractionDigits })} ${symbol}`
}

function formatPoolAmount(amount: number) {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function tokenPnl(row: DashboardWalletBalanceRow) {
  const basisMultiplier = TOKEN_PNL_BASIS_MULTIPLIER[row.assetId]
  if (basisMultiplier == null) return null

  const basisValueUsd = row.valueUsd * basisMultiplier
  const pnlUsd = row.valueUsd - basisValueUsd
  const pnlPct = basisValueUsd === 0 ? 0 : (pnlUsd / basisValueUsd) * 100
  return { pnlUsd, pnlPct }
}

function poolUiDetail(row: DashboardWalletBalanceRow) {
  return LP_UI_DETAILS[row.assetId] ?? { feesUsd: 0, status: "inactive" as const }
}

function poolStatusCopy(status: "in_range" | "out_of_range" | "inactive", t: (key: string) => string) {
  if (status === "in_range") return t("In range")
  if (status === "out_of_range") return t("Out of range")
  return t("Inactive")
}

function poolStatusClass(status: "in_range" | "out_of_range" | "inactive") {
  if (status === "in_range") return "bg-emerald-50 text-emerald-700"
  if (status === "out_of_range") return "bg-amber-50 text-amber-700"
  return "bg-muted text-muted-foreground"
}

function toBorrowVisual(symbol: string): BorrowAssetVisual {
  const meta = getTokenIconMeta(symbol)
  return {
    symbol: meta.symbol,
    shortLabel: meta.symbol.slice(0, 4),
    bgClass: meta.bgClass,
    textClass: meta.textClass,
    iconUrl: meta.iconUrl,
  }
}

function lpPairVisuals(row: DashboardWalletBalanceRow): [BorrowAssetVisual, BorrowAssetVisual] | null {
  const pairLabel = row.name.replace(/\s*LP$/i, "")
  const parts = pairLabel.split("/").map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return null
  return [toBorrowVisual(parts[0]!), toBorrowVisual(parts[1]!)]
}

function PoolIdentity({ row }: { row: DashboardWalletBalanceRow }) {
  const visuals = lpPairVisuals(row)
  if (!visuals) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <TokenIcon symbol={row.symbol} size="table" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">{row.name}</div>
        </div>
      </div>
    )
  }

  return <TokenPairCell visuals={visuals} name={row.name} size="md" />
}

function PnlCell({
  row,
  exact,
  showBalance,
}: {
  row: DashboardWalletBalanceRow
  exact: (usd: number) => string
  showBalance: boolean
}) {
  const pnl = tokenPnl(row)
  if (!pnl) return <span className="text-muted-foreground">{showBalance ? DASH : MASK}</span>
  if (!showBalance) {
    return (
      <div className="text-right">
        <div className="font-data tabular-nums text-foreground">{MASK}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">{MASK}</div>
      </div>
    )
  }

  const positive = pnl.pnlUsd > 0
  const negative = pnl.pnlUsd < 0
  const toneClass = positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-foreground"
  const arrow = positive ? "▲" : negative ? "▼" : "•"
  const pct = `${Math.abs(pnl.pnlPct).toFixed(2)}%`

  return (
    <div className="text-right">
      <div className={`font-data tabular-nums ${toneClass}`}>{exact(pnl.pnlUsd)}</div>
      <div className={`mt-0.5 text-[12px] ${toneClass}`}>
        {arrow} {pct}
      </div>
    </div>
  )
}

export function DashboardWalletTab({ walletId, balances }: { walletId: string; balances?: UserAssetBalance[] }) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { exact } = useCurrency()
  const { t } = useTranslation()
  const rows = buildDashboardWalletBalanceRows({ walletId, balances })
  const tokens = rows.filter((row) => !row.isLpToken)
  const lps = rows.filter((row) => row.isLpToken)
  const totalWalletUsd = rows.reduce((total, row) => total + row.valueUsd, 0)
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section id="dashboard-wallet" className="space-y-6" aria-label={t("Wallet balances")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">{t("Wallet Balance")}</h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {t("Wallet value")}
          </div>
          <div className="font-data text-[24px] font-semibold tabular-nums text-foreground">
            {m(exact(totalWalletUsd))}
          </div>
        </div>
      </div>

      <WalletBalanceSection title={t("Tokens")} rows={tokens} exact={exact} t={t} showBalance={showDollarAmounts} />
      <PoolsBalanceSection title={t("Pools")} rows={lps} exact={exact} t={t} showBalance={showDollarAmounts} />
    </section>
  )
}

function WalletBalanceSection({
  title,
  rows,
  exact,
  t,
  showBalance,
}: {
  title: string
  rows: DashboardWalletBalanceRow[]
  exact: (usd: number) => string
  t: (key: string) => string
  showBalance: boolean
}) {
  const m = (value: string) => (showBalance ? value : MASK)
  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{sectionCount(rows.length, "token", "tokens")}</p>
      </div>

      <DesktopTableSurface className="hidden !rounded-none md:block">
        <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            <col className="w-[29%]" />
            <col className="w-[13%]" />
            <col className="w-[21%]" />
            <col className="w-[17%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
              <th className="bg-table-header px-5 py-3.5">{t("Asset")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("Price")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("Balance")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("Value")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("P/L")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td className={`px-5 py-4 align-middle ${TABLE_ROW_HOVER_LEFT}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={row.symbol} size="table" />
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">{row.name}</div>
                      <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">{row.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {m(row.valueUsd > 0 && row.amount > 0 ? exact(row.valueUsd / row.amount) : DASH)}
                </td>
                <td className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {m(formatAssetAmount(row.amount, row.symbol))}
                </td>
                <td className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}>
                  {m(exact(row.valueUsd))}
                </td>
                <td className={`px-4 py-4 ${TABLE_ROW_HOVER_RIGHT}`}>
                  <PnlCell row={row} exact={exact} showBalance={showBalance} />
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
                  {m(exact(row.valueUsd))}
                </div>
                <div className="font-data text-[12.5px] tabular-nums text-muted-foreground">
                  {m(formatAssetAmount(row.amount, row.symbol))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <div className="text-muted-foreground">{t("Price")}</div>
                <div className="mt-1 font-data tabular-nums text-foreground">
                  {m(row.valueUsd > 0 && row.amount > 0 ? exact(row.valueUsd / row.amount) : DASH)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("P/L")}</div>
                <div className="mt-1">
                  <PnlCell row={row} exact={exact} showBalance={showBalance} />
                </div>
              </div>
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

function PoolsBalanceSection({
  title,
  rows,
  exact,
  t,
  showBalance,
}: {
  title: string
  rows: DashboardWalletBalanceRow[]
  exact: (usd: number) => string
  t: (key: string) => string
  showBalance: boolean
}) {
  const m = (value: string) => (showBalance ? value : MASK)
  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{sectionCount(rows.length, "pool", "pools")}</p>
      </div>

      <DesktopTableSurface className="hidden !rounded-none md:block">
        <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
              <th className="bg-table-header px-5 py-3.5">{t("Pool")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("Balance")}</th>
              <th className="bg-table-header px-4 py-3.5 text-right">{t("Fees")}</th>
              <th className="bg-table-header px-4 py-3.5">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const detail = poolUiDetail(row)
              return (
                <tr key={row.id} className="group">
                  <td className={`px-5 py-4 align-middle ${TABLE_ROW_HOVER_LEFT}`}>
                    <PoolIdentity row={row} />
                  </td>
                  <td className={`px-4 py-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                    <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground">{m(exact(row.valueUsd))}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">{m(formatPoolAmount(row.amount))}</div>
                  </td>
                  <td className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}>
                    {m(exact(detail.feesUsd))}
                  </td>
                  <td className={`px-4 py-4 ${TABLE_ROW_HOVER_RIGHT}`}>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${poolStatusClass(detail.status)}`}
                    >
                      {poolStatusCopy(detail.status, t)}
                    </span>
                  </td>
                </tr>
              )
            })}
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
        {rows.map((row) => {
          const detail = poolUiDetail(row)
          return (
            <div key={row.id} className="rounded-radius-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PoolIdentity row={row} />
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-medium ${poolStatusClass(detail.status)}`}>
                  {poolStatusCopy(detail.status, t)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-muted-foreground">{t("Balance")}</div>
                  <div className="mt-1 font-data tabular-nums text-foreground">{m(exact(row.valueUsd))}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("Fees")}</div>
                  <div className="mt-1 font-data tabular-nums text-foreground">{m(exact(detail.feesUsd))}</div>
                </div>
              </div>
            </div>
          )
        })}
        {rows.length === 0 ? (
          <div className="rounded-radius-lg border border-border bg-card p-5 text-center text-[14px] text-muted-foreground">
            {t("No wallet balances found.")}
          </div>
        ) : null}
      </div>
    </section>
  )
}
