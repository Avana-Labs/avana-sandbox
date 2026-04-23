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
          "flex w-full flex-col gap-4 rounded-radius-md border border-border bg-surface-raised p-4 shadow-elev-1",
          className,
        )}
        aria-label={`Deposit ${detail.hero.symbol}`}
      >
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Your deposits</div>
            <div className="mt-1 font-data text-[22px] font-medium tabular-nums text-foreground">$0.00</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-200/70 bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400">
            {apyLabel} APY
          </span>
        </header>

        <dl className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
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
            className="h-9 rounded-radius-sm bg-accent-primary text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => open("withdraw")}
            className="h-9 rounded-radius-sm border border-border bg-surface-raised text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
          >
            Withdraw
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Deposits earn {apyLabel} from the base supply rate plus the spoke&apos;s risk premium.
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
