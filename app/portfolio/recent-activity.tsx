"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { cn } from "@/lib/utils"

const MASK = "••••"

const PRODUCT_OPTIONS: Array<{ id: PortfolioActivityRow["product"]; label: string }> = [
  { id: "borrow", label: "Borrow" },
  { id: "pool", label: "Pools" },
  { id: "lend", label: "Lend" },
  { id: "multiply", label: "Multiply" },
]

const ACTION_OPTIONS: Array<{ id: PortfolioActivityRow["kind"]; label: string }> = [
  { id: "supply", label: "Supply" },
  { id: "withdraw", label: "Withdraw" },
  { id: "borrow", label: "Borrow" },
  { id: "repay", label: "Repay" },
  { id: "pledge", label: "Pledge" },
  { id: "claim", label: "Claim" },
  { id: "open", label: "Open" },
  { id: "addCollateral", label: "Add collateral" },
  { id: "reduce", label: "Reduce" },
  { id: "close", label: "Close" },
  { id: "rebalance", label: "Rebalance" },
  { id: "interest", label: "Interest" },
  { id: "liquidation", label: "Liquidation" },
]

const STATUS_OPTIONS: Array<{ id: PortfolioActivityRow["status"]; label: string }> = [
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
]

const KIND_LABEL: Record<PortfolioActivityRow["kind"], string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  pledge: "Pledge",
  claim: "Claim",
  open: "Open",
  addCollateral: "Add collateral",
  reduce: "Reduce",
  close: "Close",
  rebalance: "Rebalance",
  interest: "Interest",
  liquidation: "Liquidation",
}

const STATUS_TONE: Record<PortfolioActivityRow["status"], string> = {
  confirmed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

function formatSignedUsd(amountUsd: number) {
  const absoluteValue = Math.abs(amountUsd)
  const formatted = `$${absoluteValue.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: absoluteValue >= 100_000 ? 1 : 2,
  })}`
  return amountUsd > 0 ? `+${formatted}` : amountUsd < 0 ? `-${formatted}` : formatted
}

function shortHash(txHash: string) {
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`
}

function getTxnHref(txHash: string) {
  return `https://etherscan.io/tx/${txHash}`
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

function matchesSearch(row: PortfolioActivityRow, query: string) {
  if (!query) return true
  const needle = query.toLowerCase()
  return [formatSignedUsd(row.amountUsd), row.kind, row.primaryLabel, row.product, row.secondaryLabel, row.status, row.txHash, shortHash(row.txHash)]
    .join(" ")
    .toLowerCase()
    .includes(needle)
}

function SearchPill({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  return (
    <label className="flex h-10 w-full max-w-[360px] items-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] shadow-none">
      <Search className="h-4 w-4 shrink-0 text-[#01AACF]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search transactions"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 dark:text-[#e6f8fb] dark:placeholder:text-muted-foreground/45"
      />
    </label>
  )
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
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100",
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

export function RecentActivity({ rows }: { rows: PortfolioActivityRow[] }) {
  const { showDollarAmounts } = useDisplayPreferences()
  const amount = (value: number) => (showDollarAmounts ? formatSignedUsd(value) : MASK)
  const [search, setSearch] = React.useState("")
  const [products, setProducts] = React.useState<PortfolioActivityRow["product"][]>([])
  const [kinds, setKinds] = React.useState<PortfolioActivityRow["kind"][]>([])
  const [statuses, setStatuses] = React.useState<PortfolioActivityRow["status"][]>([])

  const hasFilters = products.length > 0 || kinds.length > 0 || statuses.length > 0
  const visibleItems = React.useMemo(
    () =>
      rows
        .filter((row) => (products.length ? products.includes(row.product) : true))
        .filter((row) => (kinds.length ? kinds.includes(row.kind) : true))
        .filter((row) => (statuses.length ? statuses.includes(row.status) : true))
        .filter((row) => matchesSearch(row, search))
        // Newest first so a just-completed action lands at the top immediately.
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [kinds, products, rows, search, statuses],
  )

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchPill value={search} onChange={setSearch} />
        <div className="flex flex-wrap items-center gap-2">
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
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                : "bg-foreground text-background",
            )}
          >
            All
          </button>
          <FilterMenu label="Product" options={PRODUCT_OPTIONS} values={products} onChange={setProducts} />
          <FilterMenu label="Action" options={ACTION_OPTIONS} values={kinds} onChange={setKinds} />
          <FilterMenu label="Status" options={STATUS_OPTIONS} values={statuses} onChange={setStatuses} />
        </div>
      </div>

      {/* Mobile: card list (the wide table is unusable on phones) */}
      <div className="space-y-2 md:hidden">
        {visibleItems.length ? (
          visibleItems.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="text-[14px] font-medium text-foreground">{KIND_LABEL[row.kind]}</span>
                  <span className="truncate text-[12px] text-muted-foreground">
                    · {PRODUCT_OPTIONS.find((option) => option.id === row.product)?.label}
                  </span>
                </div>
                <span className="shrink-0 font-data text-[12.5px] tabular-nums text-muted-foreground">{formatRelativeTime(row.at)}</span>
              </div>
              <div className="mt-1.5 min-w-0">
                <div className="truncate text-[14px] text-foreground">{row.primaryLabel}</div>
                <div className="truncate text-[12px] text-muted-foreground">{row.secondaryLabel}</div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="font-data text-[14px] font-medium tabular-nums text-foreground">{amount(row.amountUsd)}</span>
                <div className="flex items-center gap-2.5">
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[row.status])}>
                    {STATUS_OPTIONS.find((option) => option.id === row.status)?.label}
                  </span>
                  <a
                    href={getTxnHref(row.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-data text-[12px] tabular-nums text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {shortHash(row.txHash)}
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
            No activity matches the current filters.
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-radius-md bg-transparent md:block md:overflow-visible">
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
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-table-header px-5 py-3.5">Time</th>
                <th className="bg-table-header px-5 py-3.5">Type</th>
                <th className="bg-table-header px-5 py-3.5">Product</th>
                <th className="bg-table-header px-5 py-3.5">For</th>
                <th className="bg-table-header px-5 py-3.5">Amount</th>
                <th className="bg-table-header px-5 py-3.5">Status</th>
                <th className="rounded-r-2xl bg-table-header px-5 py-3.5 text-right">Txn</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length ? (
                visibleItems.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/80 dark:hover:bg-slate-900/70">
                    <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">{formatRelativeTime(row.at)}</td>
                    <td className="px-5 py-4 align-middle">
                      <span className="inline-block whitespace-nowrap text-[15px] font-medium text-foreground">{KIND_LABEL[row.kind]}</span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className="text-[14px] text-muted-foreground">
                        {PRODUCT_OPTIONS.find((option) => option.id === row.product)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">{row.primaryLabel}</div>
                        <div className="truncate text-[12px] text-muted-foreground">{row.secondaryLabel}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle font-data text-[14px] font-medium tabular-nums text-foreground">{amount(row.amountUsd)}</td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium", STATUS_TONE[row.status])}>
                        {STATUS_OPTIONS.find((option) => option.id === row.status)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right font-data text-[13px] tabular-nums text-foreground">
                      <a
                        href={getTxnHref(row.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                      >
                        {shortHash(row.txHash)}
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                    No activity matches the current filters.
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
