"use client"

import { cn } from "@/lib/utils"

export type AskAIFinancialResult = {
  kind: "portfolio" | "borrow_capacity" | "position_risk" | "market" | "pool"
  title: string
  asOf?: number
  freshness?: "fresh" | "stale" | "unavailable"
  metrics: Array<{ label: string; value: string; after?: string }>
  columns?: string[]
  rows?: Array<{ id: string; cells: string[] }>
}

export function AskAIFinancialResultCard({ result }: { result: AskAIFinancialResult }) {
  return (
    <section
      aria-label={result.title}
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-sm shadow-sm shadow-black/[0.02]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">{result.title}</h3>
        {result.freshness ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs capitalize",
              result.freshness === "fresh"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : result.freshness === "stale"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {result.freshness}
          </span>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
        {result.metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 border-t border-border/50 pt-2">
            <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-2 font-medium tabular-nums text-foreground">
              <span>{metric.value}</span>
              {metric.after ? <span className="text-muted-foreground">→ {metric.after}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {result.columns?.length && result.rows?.length ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {result.columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`} className="px-3 py-2 tabular-nums text-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {result.asOf ? (
        <p className="mt-3 text-xs text-muted-foreground">As of {new Date(result.asOf).toLocaleString()}</p>
      ) : null}
    </section>
  )
}
