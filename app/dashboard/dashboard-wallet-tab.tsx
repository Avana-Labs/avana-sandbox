"use client"

import { TokenPairCell } from "@/app/borrow/components/atoms"
import { detailSectionStackClass } from "@/app/components/detail-page-primitives"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { TokenIcon } from "@/app/components/token-icon"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { getTokenIconMeta } from "@/app/lib/token-icons"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { buildDashboardWalletBalanceRows, type DashboardWalletBalanceRow } from "@/app/lib/swap-system"
import type { UserAssetBalance } from "@/app/lib/swap-system"
import { useConvexProductWalletBalances } from "@/app/lib/swap-system/use-convex-wallet-balances"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { BorrowAssetVisual } from "@/app/lib/data/borrow-domain"

const DASH = "\u2014"
const MASK = "••••"

// Do not invent token P/L or LP fee/status analytics — show dashes until live data exists.
const LP_UI_DETAILS: Record<string, { feesUsd: number; status: "inactive"; protocol: string }> = {}

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

function tokenPnl(_row: DashboardWalletBalanceRow): { pnlUsd: number; pnlPct: number } | null {
  // Fabricated wallet P/L removed (P1-04). Keep the column; show dash until live data exists.
  return null
}

function poolUiDetail(row: DashboardWalletBalanceRow) {
  return LP_UI_DETAILS[row.assetId] ?? { feesUsd: 0, status: "inactive" as const, protocol: row.sourceLabel }
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
  const parts = pairLabel
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return null
  return [toBorrowVisual(parts[0]!), toBorrowVisual(parts[1]!)]
}

function PoolIdentity({ row }: { row: DashboardWalletBalanceRow }) {
  const visuals = lpPairVisuals(row)
  const detail = poolUiDetail(row)
  if (!visuals) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <TokenIcon symbol={row.symbol} size="table" />
        <div className="flex min-w-0 flex-col">
          <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">{detail.protocol}</div>
        </div>
      </div>
    )
  }

  return <TokenPairCell visuals={visuals} name={row.name} subtitle={detail.protocol} size="md" />
}

function PoolSourceStatus({ row }: { row: DashboardWalletBalanceRow }) {
  const pledged = row.sourceLabel === "Pledged collateral"
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        pledged ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      ].join(" ")}
    >
      <span className={["size-1.5 rounded-full", pledged ? "bg-primary" : "bg-muted-foreground/60"].join(" ")} />
      {row.sourceLabel}
    </span>
  )
}

function TokenUsdCell({ token, usd }: { token: string; usd: string }) {
  return (
    <div className="flex flex-col items-end pr-4">
      <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground">{token}</span>
      <span className="text-[13px] text-muted-foreground">{usd}</span>
    </div>
  )
}

function WalletMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-0 space-y-1.5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
        {value}
      </div>
    </article>
  )
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
        <div className="mt-0.5 text-[13px] text-muted-foreground">{MASK}</div>
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

/**
 * "Wallet Value" = the value of the wallet's UNALLOCATED funds only. Callers pass rows
 * already filtered to sourceType "wallet" (product-committed buckets live on their own
 * tabs), so this is a plain sum of the free/liquid holdings.
 */
export function sumWalletValueUsd(rows: ReadonlyArray<{ valueUsd: number; sourceLabel: string }>): number {
  return rows.reduce((total, row) => total + row.valueUsd, 0)
}

export function DashboardWalletTab({ walletId, balances }: { walletId: string; balances?: UserAssetBalance[] }) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { exact } = useCurrency()
  const { t } = useTranslation()
  // The Wallet tab shows ONLY unallocated/free funds (sourceType "wallet"). Everything committed
  // to a product — lend available/deposited, multiply available/active, borrow collateral/pledged —
  // is shown on that product's own tab, so it's never double-represented here.
  const convexBalances = useConvexProductWalletBalances(balances === undefined ? walletId : null)
  const effectiveBalances = balances ?? convexBalances ?? undefined
  const priceFor = useCanonicalPriceFor()
  const rows = buildDashboardWalletBalanceRows({ walletId, balances: effectiveBalances, priceFor }).filter(
    (row) => row.sourceType === "wallet",
  )
  const tokens = rows.filter((row) => !row.isLpToken)
  const lps = rows.filter((row) => row.isLpToken)
  const totalWalletUsd = sumWalletValueUsd(rows)
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section id="dashboard-wallet" className={detailSectionStackClass} aria-label={t("Wallet balances")}>
      <section className="space-y-4">
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">
          {t("Wallet Balance")}
        </h2>
        <div className="grid w-full grid-cols-1 gap-5 xl:gap-x-8">
          <WalletMetric label={t("Wallet Value")} value={m(exact(totalWalletUsd))} />
        </div>
      </section>

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
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            <col className="w-[29%]" />
            <col className="w-[13%]" />
            <col className="w-[21%]" />
            <col className="w-[17%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Asset")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("Price")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("Balance")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("Value")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("P/L")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td className={`px-5 py-4 align-middle ${TABLE_ROW_HOVER_LEFT}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenIcon symbol={row.symbol} size="table" />
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">
                        {row.name}
                      </div>
                      <div className="mt-0.5 text-[13px] text-muted-foreground">
                        {row.symbol} · {row.sourceLabel}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}
                >
                  {m(row.valueUsd > 0 && row.amount > 0 ? exact(row.valueUsd / row.amount) : DASH)}
                </td>
                <td
                  className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}
                >
                  {m(formatAssetAmount(row.amount, row.symbol))}
                </td>
                <td
                  className={`px-4 py-4 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground ${TABLE_ROW_HOVER_BG}`}
                >
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
                  <div className="text-[13px] text-muted-foreground">
                    {row.symbol} · {row.sourceLabel}
                  </div>
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
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[26%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Pool")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5">{t("Status")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("Balance")}</th>
              <th className="bg-table-header px-4 pb-2 pt-2.5 text-right">{t("Fees")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr key={row.id} className="group">
                  <td className={`px-5 py-4 align-middle ${TABLE_ROW_HOVER_LEFT}`}>
                    <PoolIdentity row={row} />
                  </td>
                  <td className={`px-4 py-4 ${TABLE_ROW_HOVER_BG}`}>
                    <PoolSourceStatus row={row} />
                  </td>
                  <td className={`px-4 py-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                    <TokenUsdCell token={m(formatPoolAmount(row.amount))} usd={m(exact(row.valueUsd))} />
                  </td>
                  <td className={`px-4 py-4 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                    <TokenUsdCell token={m(exact(poolUiDetail(row).feesUsd))} usd={m(t("Unclaimed fees"))} />
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
          return (
            <div key={row.id} className="rounded-radius-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PoolIdentity row={row} />
                </div>
                <PoolSourceStatus row={row} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-muted-foreground">{t("Status")}</div>
                  <div className="mt-1">
                    <PoolSourceStatus row={row} />
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("Balance")}</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className="font-data tabular-nums text-foreground">{m(formatPoolAmount(row.amount))}</span>
                    <span className="text-[13px] text-muted-foreground">{m(exact(row.valueUsd))}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-[13px]">
                <div>
                  <div className="text-muted-foreground">{t("Fees")}</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className="font-data tabular-nums text-foreground">
                      {m(exact(poolUiDetail(row).feesUsd))}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{m(t("Unclaimed fees"))}</span>
                  </div>
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
