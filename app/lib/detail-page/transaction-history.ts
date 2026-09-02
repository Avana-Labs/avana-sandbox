import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import type { LanguageCode } from "@/app/components/display-preferences"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import type { MultiplyTxHistoryRow } from "@/app/lib/multiply-detail"
import type { LendTransactionHistoryItem } from "@/app/lib/lend-system/contracts"
import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import type { MultiplyTransactionHistoryItem } from "@/app/lib/multiply-system/contracts"

/** Shared row shape for detail-page transaction tables. */
export type DetailTransactionRow = {
  id: string
  at: string
  timeLabel?: string
  kind: string
  amountLabel: string
  tokenAmountLabel?: string
  tokenSymbol?: string
  tokenSymbolSecondary?: string
  counterpartyLabel?: string
  walletLabel?: string
  walletHref?: string
  txHashShort: string
}

export function formatRelativeTime(iso: string, language: LanguageCode = "EN") {
  const locale = LANGUAGE_HTML_LANG[language] ?? "en"
  const elapsedMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" })

  if (totalSeconds < 60) return rtf.format(-totalSeconds, "second")
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return rtf.format(-totalMinutes, "minute")
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return rtf.format(-totalHours, "hour")
  return rtf.format(-Math.floor(totalHours / 24), "day")
}

function formatRelativeAge(elapsedMs: number) {
  const s = Math.max(1, Math.floor(elapsedMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function mergeTransactionRows(
  sessionRows: DetailTransactionRow[],
  convexRows: DetailTransactionRow[],
  seedRows: DetailTransactionRow[] = [],
  limit = 25,
): DetailTransactionRow[] {
  const seen = new Set<string>()
  const merged: DetailTransactionRow[] = []
  for (const row of [...sessionRows, ...convexRows, ...seedRows]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
    if (merged.length >= limit) break
  }
  return merged
}

export function mapBorrowTxRow(row: TxHistoryRow): DetailTransactionRow {
  return {
    id: row.id,
    at: row.at,
    timeLabel: row.timeLabel,
    kind: row.kind,
    amountLabel: row.amountLabel,
    tokenAmountLabel: row.tokenAmountLabel ?? row.token0AmountLabel ?? row.token1AmountLabel,
    tokenSymbol: row.tokenSymbol,
    tokenSymbolSecondary: row.tokenSymbolSecondary,
    counterpartyLabel: row.counterpartyLabel,
    walletLabel: row.walletLabel,
    walletHref: row.walletHref,
    txHashShort: row.txHashShort,
  }
}

export function mapMultiplyTxRow(row: MultiplyTxHistoryRow): DetailTransactionRow {
  return {
    id: row.id,
    at: row.at,
    timeLabel: row.timeLabel,
    kind: row.kind,
    amountLabel: row.amountLabel,
    tokenAmountLabel: row.tokenAmountLabel ?? inferTokenAmountFromLabel(row.amountLabel),
    tokenSymbol: row.tokenSymbol ?? inferSymbolFromCounterparty(row.counterpartyLabel),
    tokenSymbolSecondary: row.tokenSymbolSecondary,
    counterpartyLabel: row.counterpartyLabel,
    walletLabel: row.walletLabel,
    walletHref: row.walletHref,
    txHashShort: row.txHashShort,
  }
}

export function mapLendSessionRows(
  history: LendTransactionHistoryItem[],
  marketId: string,
  assetSymbol: string,
): DetailTransactionRow[] {
  const now = Date.now()
  return history
    .filter((item) => item.marketId === marketId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      timeLabel: formatRelativeAge(now - item.timestamp),
      kind: item.kind === "deposit" ? "supply" : item.kind === "claim" ? "rewards" : "withdraw",
      amountLabel: `${item.kind === "withdraw" ? "-" : "+"}${item.amount.toFixed(4)} ${assetSymbol}`,
      tokenAmountLabel: item.amount.toFixed(4),
      tokenSymbol: assetSymbol,
      walletLabel: "Sandbox wallet",
      txHashShort: item.hash.slice(0, 10),
    }))
}

export function mapBorrowSessionRows(
  history: TransactionHistoryItem[],
  marketSlug?: string,
  assetSymbol?: string,
): DetailTransactionRow[] {
  const now = Date.now()
  const actionToKind: Record<TransactionHistoryItem["kind"], string> = {
    deposit: "supply",
    borrow: "borrow",
    repay: "repay",
    withdraw: "withdraw",
    liquidate: "liquidation",
    claim: "rewards",
  }
  return history
    .filter((item) => !marketSlug || item.marketId === marketSlug || item.assetId === marketSlug)
    .map((item) => {
      const kind = actionToKind[item.kind]
      const usd = Number(item.executedAmountUsd6) / 1_000_000
      const symbol = assetSymbol ?? item.assetId?.split(":").pop()?.toUpperCase() ?? "USD"
      return {
        id: item.id,
        at: new Date(item.timestamp).toISOString(),
        timeLabel: formatRelativeAge(now - item.timestamp),
        kind,
        amountLabel: `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        tokenAmountLabel: usd >= 1000 ? `${(usd / 1000).toFixed(1)}K` : usd.toFixed(2),
        tokenSymbol: symbol,
        walletLabel: "Sandbox wallet",
        txHashShort: item.hash.slice(0, 10),
      }
    })
}

export function mapMultiplySessionRows(
  history: MultiplyTransactionHistoryItem[],
  marketId: string,
  collateralSymbol: string,
  borrowableSymbol: string,
): DetailTransactionRow[] {
  const now = Date.now()
  return history
    .filter((item) => item.marketId === marketId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      timeLabel: formatRelativeAge(now - item.timestamp),
      kind: item.kind === "multiply" ? "open" : "reduce",
      amountLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
      tokenAmountLabel: `${item.multiplierAfter.toFixed(2)}x`,
      tokenSymbol: collateralSymbol,
      tokenSymbolSecondary: borrowableSymbol,
      counterpartyLabel: `${collateralSymbol}/${borrowableSymbol}`,
      walletLabel: "Sandbox wallet",
      txHashShort: item.hash.slice(0, 10),
    }))
}

function inferTokenAmountFromLabel(label: string): string | undefined {
  if (label.includes("→")) return label.split("→").pop()?.trim()
  const numeric = label.replace(/[^0-9.KMx]/gi, "").trim()
  return numeric || undefined
}

function inferSymbolFromCounterparty(label?: string): string | undefined {
  if (!label) return undefined
  const token = label.split(/[\s/]/)[0]
  return token && /^[A-Za-z0-9.+-]+$/.test(token) ? token : undefined
}

export function enrichDetailTransactionRow(
  row: DetailTransactionRow,
  context: Record<string, string> = {},
  preset: "standard" | "pool" = "standard",
): DetailTransactionRow {
  if (preset === "pool" && context.token0Symbol && context.token1Symbol) {
    if (row.tokenSymbol && row.tokenAmountLabel && row.tokenSymbolSecondary) return row
    return enrichPoolRowWithPair(row, context.token0Symbol, context.token1Symbol)
  }

  if (row.tokenSymbol && row.tokenAmountLabel) return row

  const symbol = context.assetSymbol ?? context.collateralSymbol
  if (!symbol) return row
  return enrichBorrowRowWithAsset(row, symbol, row.kind)
}
export function enrichBorrowRowWithAsset(
  row: DetailTransactionRow,
  assetSymbol: string,
  _kind: string,
): DetailTransactionRow {
  if (row.tokenSymbol) return row
  const numeric = row.amountLabel
    .replace(/[^0-9.KMBx+-]/gi, "")
    .replace(/^[+-]/, "")
    .trim()
  return {
    ...row,
    tokenSymbol: assetSymbol,
    tokenAmountLabel: numeric || row.tokenAmountLabel,
  }
}

export function enrichPoolRowWithPair(
  row: DetailTransactionRow,
  token0Symbol: string,
  token1Symbol: string,
  token0AmountLabel?: string,
  token1AmountLabel?: string,
): DetailTransactionRow {
  return {
    ...row,
    tokenSymbol: row.tokenSymbol ?? token0Symbol,
    tokenSymbolSecondary: row.tokenSymbolSecondary ?? token1Symbol,
    tokenAmountLabel:
      token0AmountLabel && token1AmountLabel ? `${token0AmountLabel} / ${token1AmountLabel}` : row.tokenAmountLabel,
  }
}
