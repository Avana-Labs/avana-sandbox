"use client"

import { TokenIcon } from "@/app/components/token-icon"
import type { DetailTransactionRow } from "@/app/lib/detail-page/transaction-history"
import { cn } from "@/lib/utils"

function PairedTokenIcons({
  primary,
  secondary,
  className,
}: {
  primary: string
  secondary: string
  className?: string
}) {
  return (
    <span className={cn("relative inline-flex h-6 w-9 shrink-0", className)}>
      <TokenIcon symbol={primary} size="sm" className="absolute left-0 top-0" />
      <TokenIcon symbol={secondary} size="sm" className="absolute left-3 top-0 ring-2 ring-background" />
    </span>
  )
}

export function TransactionTokenCell({
  row,
  fallback,
  fallbackSymbol,
  paired = false,
}: {
  row: DetailTransactionRow
  fallback?: string
  fallbackSymbol?: string
  paired?: boolean
}) {
  if (row.tokenSymbol && row.tokenAmountLabel) {
    return (
      <div className="flex items-center justify-end gap-2">
        {paired && row.tokenSymbolSecondary ? (
          <PairedTokenIcons primary={row.tokenSymbol} secondary={row.tokenSymbolSecondary} />
        ) : (
          <TokenIcon symbol={row.tokenSymbol} size="sm" className="shrink-0" />
        )}
        <span className="whitespace-nowrap tabular-nums text-[13px] font-normal tracking-normal text-muted-foreground">
          {row.tokenAmountLabel} {row.tokenSymbol}
        </span>
      </div>
    )
  }

  if (fallback) {
    const symbol = fallbackSymbol ?? row.tokenSymbol
    return (
      <div className="flex items-center justify-end gap-2">
        {symbol ? <TokenIcon symbol={symbol} size="sm" className="shrink-0" /> : null}
        <span className="inline-block whitespace-nowrap text-[13px] text-muted-foreground">{fallback}</span>
      </div>
    )
  }

  return null
}

export function TransactionAmountCell({ row, paired = false }: { row: DetailTransactionRow; paired?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2">
      {paired && row.tokenSymbol && row.tokenSymbolSecondary ? (
        <PairedTokenIcons primary={row.tokenSymbol} secondary={row.tokenSymbolSecondary} />
      ) : row.tokenSymbol ? (
        <TokenIcon symbol={row.tokenSymbol} size="sm" className="shrink-0" />
      ) : null}
      <span className="font-data text-[15px] font-normal tabular-nums tracking-normal text-foreground">
        {row.amountLabel.replace(/^\+/, "")}
      </span>
    </div>
  )
}
