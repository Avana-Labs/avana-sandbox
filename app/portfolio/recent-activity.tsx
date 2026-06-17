"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  type PortfolioActivityKind,
  type PortfolioActivityProduct,
  type PortfolioActivityStatus,
} from "@/app/lib/portfolio-activity"
import { cn } from "@/lib/utils"
import { usePortfolioActivity } from "./use-portfolio-activity"

const PRODUCT_OPTIONS: Array<{ id: PortfolioActivityProduct; label: string }> = [
  { id: "borrow", label: "Borrow" },
  { id: "pool", label: "Pools" },
  { id: "lend", label: "Lend" },
  { id: "multiply", label: "Multiply" },
]

const ACTION_OPTIONS: Array<{ id: PortfolioActivityKind; label: string }> = [
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

const STATUS_OPTIONS: Array<{ id: PortfolioActivityStatus; label: string }> = [
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
]

const PRODUCT_TONE: Record<PortfolioActivityProduct, string> = {
  borrow: "text-sky-700 dark:text-sky-300",
  pool: "text-violet-700 dark:text-violet-300",
  lend: "text-emerald-700 dark:text-emerald-300",
  multiply: "text-amber-700 dark:text-amber-300",
}

const KIND_TONE: Record<PortfolioActivityKind, string> = {
  supply: "text-emerald-600 dark:text-emerald-400",
  withdraw: "text-rose-600 dark:text-rose-400",
  borrow: "text-rose-600 dark:text-rose-400",
  repay: "text-emerald-600 dark:text-emerald-400",
  pledge: "text-emerald-600 dark:text-emerald-400",
  claim: "text-slate-700 dark:text-slate-300",
  open: "text-emerald-600 dark:text-emerald-400",
  addCollateral: "text-emerald-600 dark:text-emerald-400",
  reduce: "text-rose-600 dark:text-rose-400",
  close: "text-rose-600 dark:text-rose-400",
  rebalance: "text-amber-600 dark:text-amber-400",
  interest: "text-slate-700 dark:text-slate-300",
  liquidation: "text-amber-600 dark:text-amber-400",
}

const KIND_LABEL: Record<PortfolioActivityKind, string> = {
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

const STATUS_TONE: Record<PortfolioActivityStatus, string> = {
  confirmed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
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

export function RecentActivity({ walletAddress }: { walletAddress: string }) {
  const [products, setProducts] = React.useState<PortfolioActivityProduct[]>([])
  const [kinds, setKinds] = React.useState<PortfolioActivityKind[]>([])
  const [statuses, setStatuses] = React.useState<PortfolioActivityStatus[]>([])

  const { data, error, isLoading } = usePortfolioActivity({
    walletAddress,
    limit: 50,
    products: products.length ? products : undefined,
    kinds: kinds.length ? kinds : undefined,
    statuses: statuses.length ? statuses : undefined,
  })

  const hasFilters = products.length > 0 || kinds.length > 0 || statuses.length > 0

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">Recent activity</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Wallet-scoped history across borrow, pool collateral, lend, and multiply actions.
          </p>
        </div>
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

      <div className="overflow-x-auto rounded-[18px] bg-white dark:bg-slate-950 md:overflow-visible">
        <div className="min-w-[1040px] md:min-w-0">
          <table className="w-full table-fixed border-separate border-spacing-0 text-[14px]">
            <colgroup>
              <col className="w-[88px] md:w-[72px]" />
              <col className="w-[148px] md:w-[132px]" />
              <col className="w-[112px] md:w-[100px]" />
              <col className="w-[280px] md:w-[260px]" />
              <col className="w-[120px] md:w-[96px]" />
              <col className="w-[120px] md:w-[112px]" />
              <col className="w-[132px] md:w-[104px]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Time</th>
                <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Type</th>
                <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Product</th>
                <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">For</th>
                <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Amount</th>
                <th className="bg-slate-50 px-5 py-3.5 dark:bg-slate-900/90">Status</th>
                <th className="rounded-r-2xl bg-slate-50 px-5 py-3.5 text-right dark:bg-slate-900/90">Txn</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`loading-${index}`} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-10 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-5 py-4"><div className="ml-auto h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-rose-600 dark:text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : data?.items.length ? (
                data.items.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/70">
                    <td className="px-5 py-4 align-middle font-data text-[14px] tabular-nums text-foreground">
                      {formatRelativeTime(row.at)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn("inline-block whitespace-nowrap text-[15px] font-medium", KIND_TONE[row.kind])}>
                        {KIND_LABEL[row.kind]}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn("text-[14px] font-medium", PRODUCT_TONE[row.product])}>
                        {PRODUCT_OPTIONS.find((option) => option.id === row.product)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">{row.primaryLabel}</div>
                        <div className="truncate text-[12px] text-muted-foreground">{row.secondaryLabel}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle font-data text-[14px] font-medium tabular-nums text-foreground">
                      {row.amountLabel}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium", STATUS_TONE[row.status])}>
                        {STATUS_OPTIONS.find((option) => option.id === row.status)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right font-data text-[13px] tabular-nums text-foreground">
                      <a
                        href={row.txHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block whitespace-nowrap align-middle text-foreground underline-offset-2 hover:underline"
                      >
                        {row.txHashShort}
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
