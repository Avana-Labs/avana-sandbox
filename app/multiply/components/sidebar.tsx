"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type TxStatus = "confirmed" | "pending"

/**
 * A relative day key ("Today"/"Yesterday") is translated via `t(...)`; an ISO
 * date string is rendered with a locale-aware month/day formatter. The clock
 * time is locale-neutral and kept verbatim.
 */
type TxDay = { kind: "relative"; label: "Today" | "Yesterday" } | { kind: "date"; iso: string }

type TxEntry = {
  action: string
  status: TxStatus
  details: string
  day: TxDay
  time: string
  /** Signed USD amount; sign drives the +/- prefix and color. */
  amountUsd: number
}

export const TX_HISTORY: TxEntry[] = [
  {
    action: "Supply",
    status: "confirmed",
    details: "USDC → Core sleeve",
    day: { kind: "relative", label: "Today" },
    time: "09:24",
    amountUsd: 2400,
  },
  {
    action: "Funding",
    status: "confirmed",
    details: "BTC 8h",
    day: { kind: "relative", label: "Yesterday" },
    time: "16:02",
    amountUsd: -12.4,
  },
  {
    action: "Borrow",
    status: "confirmed",
    details: "Against ETH/USDC LP",
    day: { kind: "relative", label: "Yesterday" },
    time: "11:18",
    amountUsd: 5000,
  },
  {
    action: "Withdraw",
    status: "pending",
    details: "USDC",
    day: { kind: "date", iso: "2025-04-18" },
    time: "08:55",
    amountUsd: -800,
  },
]

export function PromoCard() {
  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-emerald-500/5 shadow-none">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
      <CardContent className="relative z-10 p-6">
        <h3 className="mb-2 font-semibold text-emerald-700 dark:text-emerald-50">Multiply LP-backed positions</h3>
        <p className="mb-4 text-sm text-emerald-700/80 dark:text-emerald-100/70">
          Use your active LP positions across Uniswap and Aerodrome as collateral to multiply directional exposure without unstaking.
        </p>
        <Button variant="secondary" className="w-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30">
          Learn more
        </Button>
      </CardContent>
    </Card>
  )
}

export function TransactionHistoryList() {
  const currency = useCurrency()
  const { language } = useDisplayPreferences()
  const { t } = useTranslation()
  const locale = LANGUAGE_HTML_LANG[language] ?? "en"

  const formatDay = (day: TxDay) => {
    if (day.kind === "relative") return t(day.label)
    const d = new Date(`${day.iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return day.iso
    return d.toLocaleDateString(locale, { month: "short", day: "numeric" })
  }

  return (
    <div>
      <ul className="divide-y divide-border/40">
        {TX_HISTORY.map((tx, i) => {
          const positive = tx.amountUsd > 0
          const sign = positive ? "+" : tx.amountUsd < 0 ? "-" : ""
          return (
            <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{tx.action}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    tx.status === 'confirmed'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tx.details}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{`${formatDay(tx.day)} · ${tx.time}`}</p>
              </div>
              <span className={`font-data text-sm ${positive ? 'text-emerald-500' : 'text-foreground'}`}>
                {`${sign}${currency.exact(Math.abs(tx.amountUsd))}`}
              </span>
            </li>
          )
        })}
      </ul>
      <Button variant="ghost" className="mt-4 w-full text-xs text-muted-foreground">
        View all activity
      </Button>
    </div>
  )
}
