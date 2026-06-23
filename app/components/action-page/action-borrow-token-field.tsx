"use client"

import { useState } from "react"
import type { HomeBorrowToken } from "@/app/lib/home-sim"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"

export function ActionBorrowTokenField({
  label,
  token,
  tokens,
  onTokenChange,
}: {
  label: string
  token: HomeBorrowToken | null
  tokens: HomeBorrowToken[]
  onTokenChange: (tokenId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <SwapStyleField label={label}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {token?.symbol ?? "0"}
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium">
            {token ? <ActionTokenIcon symbol={token.symbol} /> : null}
            <span>{token?.symbol ?? "Select asset"}</span>
            <span className="text-muted-foreground" aria-hidden>
              ▾
            </span>
          </div>
        </button>
      </SwapStyleField>

      <TokenPickerDialog
        open={open}
        onOpenChange={setOpen}
        selectedTokenId={token?.id ?? null}
        tokens={tokens}
        onSelect={(tokenId) => {
          onTokenChange(tokenId)
          setOpen(false)
        }}
      />
    </>
  )
}
