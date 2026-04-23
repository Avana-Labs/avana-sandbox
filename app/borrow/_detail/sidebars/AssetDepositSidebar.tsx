"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { LendModals } from "@/app/lend/components/lend-modals"
import { TOKENS, MARKETS } from "@/app/lend/components/data"

type Props = { detail: AssetDetail; className?: string }

type LendToken = (typeof TOKENS)[number] | (typeof MARKETS)[number]
type ModalState = {
  isOpen: boolean
  type: "deposit" | "withdraw" | "success"
  actionType: "deposit" | "withdraw"
  token: LendToken | null
  amount: string
}

const INITIAL_MODAL: ModalState = {
  isOpen: false,
  type: "deposit",
  actionType: "deposit",
  token: null,
  amount: "",
}

/**
 * Right-column sidebar on the asset detail page.
 *
 * Keeps the page-visible surface tiny (summary + two buttons) and delegates
 * the actual deposit / withdraw flow to the existing lend `LendModals`
 * component. That way the asset page never recreates the confirm/success
 * screen and any lend changes (confetti, Max, base rate breakdown, ...)
 * automatically flow here too.
 */
export function AssetDepositSidebar({ detail, className }: Props) {
  const [modalState, setModalState] = React.useState<ModalState>(INITIAL_MODAL)

  const token = React.useMemo(() => toLendToken(detail), [detail])

  const open = (action: "deposit" | "withdraw") => {
    setModalState({
      isOpen: true,
      type: action,
      actionType: action,
      token,
      amount: "",
    })
  }

  const close = () => setModalState((prev) => ({ ...prev, isOpen: false }))

  const apyLabel = `${token.apy.toFixed(2)}%`

  return (
    <>
      <aside
        className={cn(
          "flex w-full flex-col gap-4 rounded-2xl border border-border/40 bg-card/50 p-5",
          className,
        )}
        aria-label={`Deposit ${detail.hero.symbol}`}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-muted-foreground">Your deposits</div>
            <div className="mt-1 font-data text-2xl font-medium tabular-nums text-foreground">$0.00</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {apyLabel} APY
          </span>
        </header>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Asset</dt>
          <dd className="text-right font-medium text-foreground">{detail.hero.symbol}</dd>
          <dt className="text-muted-foreground">Supply APY</dt>
          <dd className="text-right font-data tabular-nums text-foreground">{apyLabel}</dd>
          <dt className="text-muted-foreground">Wallet balance</dt>
          <dd className="text-right font-data tabular-nums text-foreground">{detail.row.walletBalanceLabel}</dd>
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => open("deposit")}
            className="h-11 rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => open("withdraw")}
            className="h-11 rounded-full border border-border/60 bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            Withdraw
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Deposits earn {apyLabel} from the base supply rate plus the spoke's risk premium.
        </p>
      </aside>

      <LendModals modalState={modalState} setModalState={setModalState} closeModal={close} />
    </>
  )
}

function toLendToken(detail: AssetDetail): LendToken {
  const catalog = TOKENS.find((t) => t.symbol.toLowerCase() === detail.hero.symbol.toLowerCase())
  if (catalog) return catalog
  const base = TOKENS[0]
  const apy = parseFloat(String(detail.row.borrowApr)) || base.apy
  const override = {
    ...base,
    symbol: detail.hero.symbol,
    name: detail.hero.name,
    apy,
    balance: 0,
    earned: 0,
    daily: 0,
  }
  return override as unknown as LendToken
}
