"use client"

import { TransactionHistoryCard } from "@/app/borrow/_detail/asset-sections/TransactionHistoryCard"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { formatAge, formatUnits, formatUsd } from "../format"

export function UmbrellaActivity() {
  const { t } = useTranslation()
  const umbrella = useUmbrellaSessionContext()
  const now = Date.now()
  const rows: TxHistoryRow[] = umbrella.transactionHistory.slice(0, 8).map((row) => ({
    id: row.id,
    at: new Date(row.timestamp).toISOString(),
    timeLabel: formatAge(now - row.timestamp),
    kind:
      row.kind === "claim"
        ? "rewards"
        : row.kind === "unstake"
          ? "withdraw"
          : row.kind === "startCooldown"
            ? "cooldown"
            : "supply",
    amountLabel:
      row.kind === "claim"
        ? formatUsd(row.amountUsd)
        : `${row.kind === "unstake" ? "-" : "+"}${formatUnits(row.amount)} ${row.symbol}`,
    walletLabel: t("Sandbox wallet"),
    txHashShort: row.hash.slice(0, 10),
    source: "sandbox",
  }))
  if (rows.length === 0) return null

  return (
    <TransactionHistoryCard
      transactions={rows}
      assetSymbol={t("Umbrella")}
      title={t("Umbrella activity")}
      kindLabelMap={{ supply: t("Stake"), withdraw: t("Unstake"), rewards: t("Claim"), cooldown: t("Cooldown") }}
      hideFilters
    />
  )
}
