"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "@/app/components/icons"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

const MASK = "••••"

const PRODUCT_OPTIONS: Array<{
  id: PortfolioActivityRow["product"]
  label: string
}> = [
  { id: "borrow", label: "Borrow" },
  { id: "pool", label: "Pools" },
  { id: "lend", label: "Lend" },
  { id: "multiply", label: "Multiply" },
  { id: "rewards", label: "Rewards" },
  { id: "swap", label: "Swap" },
  { id: "umbrella", label: "Umbrella" },
]

const ACTION_OPTIONS: Array<{
  id: PortfolioActivityRow["kind"]
  label: string
}> = [
  { id: "swap", label: "Swap" },
  { id: "supply", label: "Supply" },
  { id: "withdraw", label: "Withdraw" },
  { id: "borrow", label: "Borrow" },
  { id: "repay", label: "Repay" },
  { id: "pledge", label: "Pledge" },
  { id: "claim", label: "Claim" },
  { id: "stake", label: "Stake" },
  { id: "startCooldown", label: "Cooldown" },
  { id: "unstake", label: "Unstake" },
  { id: "open", label: "Open" },
  { id: "addCollateral", label: "Add collateral" },
  { id: "reduce", label: "Reduce" },
  { id: "close", label: "Close" },
  { id: "rebalance", label: "Rebalance" },
  { id: "interest", label: "Interest" },
  { id: "liquidation", label: "Liquidation" },
]

const STATUS_OPTIONS: Array<{
  id: PortfolioActivityRow["status"]
  label: string
}> = [
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
]

const KIND_LABEL: Record<PortfolioActivityRow["kind"], string> = {
  swap: "Swap",
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  pledge: "Pledge",
  claim: "Claim",
  stake: "Stake",
  startCooldown: "Cooldown",
  unstake: "Unstake",
  open: "Open",
  addCollateral: "Add collateral",
  reduce: "Reduce",
  close: "Close",
  rebalance: "Rebalance",
  interest: "Interest",
  liquidation: "Liquidation",
}

const STATUS_TONE: Record<PortfolioActivityRow["status"], string> = {
  confirmed: "border-emerald-500/20 bg-emerald-500/10 text-success",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

// Amount-column sign convention: user CASH FLOW, read like a bank statement.
//   +  funds moving INTO the user's wallet (they received cash)
//   −  funds moving OUT of the user's wallet (they paid or committed cash)
//   0  value-neutral / accrual rows with no wallet cash movement (shown unsigned)
// The sign is derived from the action KIND, not from the raw amount's stored sign
// (which upstream records inconsistently — the cause of Repay reading "+" while
// Withdraw read "-"). Deriving here guarantees every row reads the same way. (#F2)
export const AMOUNT_SIGN_BY_KIND: Record<PortfolioActivityRow["kind"], 1 | -1 | 0> = {
  // Cash in — the user receives funds
  borrow: 1,
  withdraw: 1,
  claim: 1,
  unstake: 1,
  reduce: 1,
  close: 1,
  // Cash out — the user pays or locks up funds
  supply: -1,
  repay: -1,
  pledge: -1,
  stake: -1,
  open: -1,
  addCollateral: -1,
  liquidation: -1,
  // No net wallet cash flow (asset swap, cooldown timer, rebalance, interest accrual)
  swap: 0,
  startCooldown: 0,
  rebalance: 0,
  interest: 0,
}

function applyAmountSign(sign: 1 | -1 | 0, body: string) {
  return sign > 0 ? `+${body}` : sign < 0 ? `-${body}` : body
}

function formatRowAmount(row: PortfolioActivityRow) {
  const sign = AMOUNT_SIGN_BY_KIND[row.kind]
  const magnitude = Math.abs(row.amountUsd)
  // Reward claims are denominated in AVA points, not USD, so the amount column
  // shows "+25 AVA" rather than a misleading "$" figure.
  const body = row.product === "rewards" ? `${magnitude.toLocaleString()} AVA` : formatCompactUsd(magnitude)
  return applyAmountSign(sign, body)
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`
}

// A canonical on-chain tx hash is 0x + 64 hex chars. Sandbox/simulated hashes
// (sim-…, sim_lend_…, 0xsim…) don't match and never exist on Etherscan, so they
// link to the in-app sandbox receipt page instead of a dead Etherscan link.
const REAL_TX_HASH = /^0x[0-9a-fA-F]{64}$/

function isSimulatedTxHash(txHash: string) {
  return !REAL_TX_HASH.test(txHash)
}

function getTxnHref(txHash: string) {
  return isSimulatedTxHash(txHash)
    ? `/sandbox/transactions/${encodeURIComponent(txHash)}`
    : `https://etherscan.io/tx/${txHash}`
}

function TxnLink({ txHash, className }: { txHash: string; className?: string }) {
  // A row with no tx hash has no receipt to open, so render plain text (not a dead link).
  if (!txHash) {
    return <span className={className}>—</span>
  }
  const external = !isSimulatedTxHash(txHash)
  return (
    <a
      href={getTxnHref(txHash)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={className}
      // The whole row is also a link to the same receipt; stop the click/Enter here
      // from bubbling up and triggering a second (duplicate) navigation.
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
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

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

type FilterTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  label: string
  count: number
}

const FilterTrigger = React.forwardRef<HTMLButtonElement, FilterTriggerProps>(function FilterTrigger(
  { label, count, className, ...props },
  ref,
) {
  const active = count > 0

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-slate-100 text-slate-600 hover:bg-surface-hover hover:text-foreground dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
      {...props}
    >
      <span>{label}</span>
      {active ? <span className="text-[11px] opacity-80">{count}</span> : null}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  )
})
FilterTrigger.displayName = "FilterTrigger"

function FilterMenu<T extends string>({
  label,
  options,
  values,
  onChange,
}: {
  label: string
  options: Array<{ id: T; label: string }>
  values: T[]
  onChange: (next: T[]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterTrigger label={label} count={values.length} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={values.includes(option.id)}
            onCheckedChange={() => onChange(toggleValue(values, option.id))}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RecentActivity({
  rows,
  defaultShowAll = false,
  showHeading = true,
}: {
  rows: PortfolioActivityRow[]
  /** When true, start expanded (used by the All Transactions dashboard tab). */
  defaultShowAll?: boolean
  showHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const router = useRouter()
  const amount = (row: PortfolioActivityRow) => (showDollarAmounts ? formatRowAmount(row) : MASK)

  // Open the receipt for a row: in-app sandbox receipt for simulated rows, Etherscan
  // (new tab) for genuinely on-chain hashes — same target as the visible hash link.
  const openReceipt = React.useCallback(
    (txHash: string) => {
      if (!txHash) return
      if (isSimulatedTxHash(txHash)) {
        router.push(getTxnHref(txHash))
      } else {
        window.open(getTxnHref(txHash), "_blank", "noopener,noreferrer")
      }
    },
    [router],
  )

  // Makes the entire row a keyboard-accessible link to its receipt. A row with no
  // hash has no receipt, so it stays non-interactive.
  const rowLinkProps = (row: PortfolioActivityRow) =>
    row.txHash
      ? {
          role: "link" as const,
          tabIndex: 0,
          "aria-label": `${t("View transaction")}: ${row.primaryLabel}`,
          onClick: () => openReceipt(row.txHash),
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              openReceipt(row.txHash)
            }
          },
        }
      : {}
  const [products, setProducts] = React.useState<PortfolioActivityRow["product"][]>([])
  const [kinds, setKinds] = React.useState<PortfolioActivityRow["kind"][]>([])
  const [statuses, setStatuses] = React.useState<PortfolioActivityRow["status"][]>([])
  const [showAll, setShowAll] = React.useState(defaultShowAll)

  const hasFilters = products.length > 0 || kinds.length > 0 || statuses.length > 0
  const visibleItems = React.useMemo(
    () =>
      rows
        .filter((row) => (products.length ? products.includes(row.product) : true))
        .filter((row) => (kinds.length ? kinds.includes(row.kind) : true))
        .filter((row) => (statuses.length ? statuses.includes(row.status) : true))
        // Newest first so a just-completed action lands at the top immediately.
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [kinds, products, rows, statuses],
  )

  // Show a short preview by default; "View all" expands to the full history.
  const COLLAPSED_COUNT = 5
  const displayItems = showAll ? visibleItems : visibleItems.slice(0, COLLAPSED_COUNT)
  const hasMore = !defaultShowAll && visibleItems.length > COLLAPSED_COUNT

  return (
    <section id="dashboard-activity" className="min-w-0 scroll-mt-24">
      {showHeading || hasMore ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {showHeading ? (
            <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">
              {t("All Transactions")}
            </h2>
          ) : (
            <span />
          )}
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
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setProducts([])
            setKinds([])
            setStatuses([])
          }}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            hasFilters
              ? "bg-slate-100 text-slate-600 hover:bg-surface-hover hover:text-foreground dark:bg-slate-800 dark:text-slate-300"
              : "bg-foreground text-background",
          )}
        >
          {t("All")}
        </button>
        <FilterMenu
          label={t("Product")}
          options={PRODUCT_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
          values={products}
          onChange={setProducts}
        />
        <FilterMenu
          label={t("Action")}
          options={ACTION_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
          values={kinds}
          onChange={setKinds}
        />
        <FilterMenu
          label={t("Status")}
          options={STATUS_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
          values={statuses}
          onChange={setStatuses}
        />
      </div>

      {/* Sign legend: amounts follow user cash flow, read like a bank statement. */}
      <p className="mb-3 text-[12px] leading-snug text-muted-foreground">
        {t("Amounts show cash flow: + received into your wallet, − paid out.")}
      </p>

      {/* Mobile: card list (the wide table is unusable on phones) */}
      <div className="space-y-2 md:hidden">
        {visibleItems.length ? (
          displayItems.map((row) => (
            <div
              key={row.id}
              {...rowLinkProps(row)}
              className={cn(
                "rounded-radius-lg border border-border bg-card p-3.5",
                row.txHash &&
                  "cursor-pointer transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="text-[14px] font-medium text-foreground">{t(KIND_LABEL[row.kind])}</span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    · {t(PRODUCT_OPTIONS.find((option) => option.id === row.product)?.label ?? row.product)}
                  </span>
                </div>
                <span className="shrink-0 font-data text-[12.5px] tabular-nums text-muted-foreground">
                  {formatRelativeTime(row.at)}
                </span>
              </div>
              <div className="mt-1.5 min-w-0">
                <div className="truncate text-[14px] text-foreground">{row.primaryLabel}</div>
                <div className="truncate text-[13px] text-muted-foreground">{row.secondaryLabel}</div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="font-data text-[14px] font-medium tabular-nums text-foreground">{amount(row)}</span>
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      STATUS_TONE[row.status],
                    )}
                  >
                    {t(STATUS_OPTIONS.find((option) => option.id === row.status)?.label ?? row.status)}
                  </span>
                  <TxnLink
                    txHash={row.txHash}
                    className="font-data text-[13px] tabular-nums text-muted-foreground underline-offset-2 hover:underline"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
            {t("No activity matches the current filters.")}
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden bg-transparent md:block md:overflow-visible">
        <div className="min-w-0">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[14px]">
            <colgroup>
              <col className="w-[72px]" />
              <col className="w-[124px]" />
              <col className="w-[92px]" />
              <col />
              <col className="w-[116px]" />
              <col className="w-[110px]" />
              <col className="w-[132px]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Time")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Type")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Product")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("For")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Amount")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5">{t("Status")}</th>
                <th className="bg-table-header px-5 pb-2 pt-2.5 text-right">{t("Txn")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length ? (
                displayItems.map((row) => (
                  <tr
                    key={row.id}
                    {...rowLinkProps(row)}
                    className={cn(
                      "transition-colors hover:bg-hover",
                      row.txHash &&
                        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
                    )}
                  >
                    <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">
                      {formatRelativeTime(row.at)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-block whitespace-nowrap text-[15px] font-medium text-foreground">
                        {t(KIND_LABEL[row.kind])}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className="text-[14px] text-muted-foreground">
                        {t(PRODUCT_OPTIONS.find((option) => option.id === row.product)?.label ?? row.product)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">{row.primaryLabel}</div>
                        <div className="truncate text-[13px] text-muted-foreground">{row.secondaryLabel}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle font-data text-[14px] font-medium tabular-nums text-foreground">
                      {amount(row)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          STATUS_TONE[row.status],
                        )}
                      >
                        {t(STATUS_OPTIONS.find((option) => option.id === row.status)?.label ?? row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right font-data text-[13px] tabular-nums text-foreground">
                      <TxnLink
                        txHash={row.txHash}
                        className="inline-block whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                    {t("No activity matches the current filters.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
