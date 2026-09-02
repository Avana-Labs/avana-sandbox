"use client"

import * as React from "react"
import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"
import { formatRelativeTime } from "@/app/lib/detail-page/transaction-history"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"
import { PRESET_COLUMNS, type DetailTransactionPreset, type TransactionKindConfig } from "./kind-configs"
import { TransactionAmountCell, TransactionTokenCell } from "./transaction-token-cell"

type Props = {
  transactions: DetailTransactionRow[]
  preset?: DetailTransactionPreset
  kindConfig: TransactionKindConfig
  context?: Record<string, string>
  title?: string
}

export function DetailTransactionTable({
  transactions,
  preset = "standard",
  kindConfig,
  context = {},
  title = "Transactions",
}: Props) {
  const { t, language } = useTranslation()
  const columns = PRESET_COLUMNS[preset]
  const paired = preset === "pool"

  return (
    <section className="min-w-0">
      <div className="mb-4">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.01em] text-foreground md:text-[24px]">
          {t(title)}
        </h2>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-radius-md border border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
          {t("No transactions yet")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className={cn(
              "w-full table-fixed border-separate border-spacing-0 text-[13px]",
              preset === "standard" ? "min-w-[720px]" : "min-w-[560px]",
            )}
          >
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    className={cn(
                      "bg-table-header px-3 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58",
                      index === 0 && "rounded-l-radius-lg pl-5",
                      index === columns.length - 1 && "rounded-r-radius-lg pr-5",
                      column.align === "right" && "text-right",
                      column.id === "time" && "w-[96px]",
                      column.id === "type" && "w-[118px]",
                      column.id === "amount" && "w-[140px]",
                      column.id === "for" && "w-[160px]",
                    )}
                  >
                    {t(column.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="group transition-colors">
                  {columns.map((column, index) => {
                    const hoverClass =
                      index === 0
                        ? `${TABLE_ROW_HOVER_LEFT} group-hover:rounded-l-radius-lg`
                        : index === columns.length - 1
                          ? `${TABLE_ROW_HOVER_RIGHT} group-hover:rounded-r-radius-lg`
                          : TABLE_ROW_HOVER_BG
                    const padX = index === 0 ? "pl-5 pr-3" : index === columns.length - 1 ? "pl-3 pr-5" : "px-3"

                    if (column.id === "time") {
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            "py-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground",
                            padX,
                            hoverClass,
                          )}
                        >
                          {row.timeLabel ?? formatRelativeTime(row.at, language)}
                        </td>
                      )
                    }

                    if (column.id === "type") {
                      return (
                        <td key={column.id} className={cn("py-3 align-middle", padX, hoverClass)}>
                          <span
                            className={cn(
                              "inline-block whitespace-nowrap text-[15px] font-medium tracking-normal",
                              kindConfig.tones[row.kind],
                            )}
                          >
                            {t(kindConfig.labels[row.kind] ?? row.kind)}
                          </span>
                        </td>
                      )
                    }

                    if (column.id === "amount") {
                      return (
                        <td key={column.id} className={cn("py-3 align-middle text-right", padX, hoverClass)}>
                          <TransactionAmountCell row={row} paired={paired} />
                        </td>
                      )
                    }

                    if (column.id === "for") {
                      const fallback = kindConfig.describeFor?.(row, context)
                      const fallbackSymbol =
                        context.assetSymbol ?? context.collateralSymbol ?? row.tokenSymbol ?? undefined
                      return (
                        <td key={column.id} className={cn("py-3 align-middle text-right", padX, hoverClass)}>
                          <TransactionTokenCell
                            row={row}
                            fallback={fallback}
                            fallbackSymbol={fallbackSymbol}
                            paired={Boolean(row.tokenSymbolSecondary)}
                          />
                        </td>
                      )
                    }

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          "py-3 align-middle text-right font-data text-[15px] font-normal tabular-nums text-foreground",
                          padX,
                          hoverClass,
                        )}
                      >
                        {row.walletHref ? (
                          <a
                            href={row.walletHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block max-w-full truncate whitespace-nowrap text-foreground underline-offset-2 hover:underline"
                          >
                            {row.walletLabel ?? row.txHashShort}
                          </a>
                        ) : (
                          <span className="inline-block max-w-full truncate whitespace-nowrap">
                            {row.walletLabel ?? row.txHashShort}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
