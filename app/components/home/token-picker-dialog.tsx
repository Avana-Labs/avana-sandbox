"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search, TrendingUp } from "lucide-react"
import { HOME_BORROW_TOKENS, type HomeBorrowToken } from "@/app/lib/home-sim"
import { TokenBubble } from "@/app/components/home-workspace-primitives"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const TOKEN_ADDRESS_BY_SYMBOL: Record<string, string> = {
  ETH: "Native",
  USDC: "0xA0b8...eB48",
  USDT: "0xdAC1...1ec7",
  WBTC: "0x2260...C599",
  DAI: "0x6B17...1d0F",
  ARB: "0x912C...6a20",
  LINK: "0x5149...1Ca",
  UNI: "0x1f98...48f1",
  AAVE: "0x7Fc6...A9e9",
  MATIC: "0x7D1A...0e4a",
  SOL: "So111...1112",
  AVAX: "0x8580...0cF8",
  OP: "0x4200...0042",
  FTM: "0x4E15...AAF8",
}

function ShortcutTokenButton({
  visual,
  symbol,
  selected,
  onClick,
}: {
  visual: HomeBorrowToken["visual"]
  symbol: string
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <TokenBubble visual={visual} className="size-9" />
      <span className="text-[13px] font-medium text-foreground">{symbol}</span>
    </button>
  )
}

export function TokenPickerDialog({
  open,
  onOpenChange,
  selectedTokenId,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTokenId: string | null
  onSelect: (tokenId: string) => void
}) {
  const [query, setQuery] = useState("")

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return HOME_BORROW_TOKENS
    }

    return HOME_BORROW_TOKENS.filter(
      (token) => token.symbol.toLowerCase().includes(normalizedQuery) || token.name.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextValue) => {
        onOpenChange(nextValue)
        if (!nextValue) {
          setQuery("")
        }
      }}
    >
      <DialogContent className="flex h-[640px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:max-w-[420px]">
        <DialogHeader className="flex-row items-center justify-between px-5 pb-3 pt-5 text-left space-y-0">
          <DialogTitle className="text-[17px] font-semibold">Select a token</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden pb-3">
          <div className="px-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-1 px-4 py-3 transition-colors focus-within:bg-surface-2">
              <Search className="h-[18px] w-[18px] text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tokens"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <button type="button" className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-sm transition-colors hover:bg-muted" aria-label="Filter networks">
                <span className="relative inline-flex">
                  <span className="inline-block size-4 rounded-full bg-brand" />
                  <span className="absolute -right-1 inline-block size-4 rounded-full bg-indigo-500 ring-2 ring-background" />
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1 px-3 pt-2">
            {HOME_BORROW_TOKENS.slice(0, 5).map((token) => (
              <ShortcutTokenButton
                key={`shortcut-${token.id}`}
                visual={token.visual}
                symbol={token.symbol}
                selected={token.id === selectedTokenId}
                onClick={() => onSelect(token.id)}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5 px-5 pb-1 pt-2 text-[13px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Tokens by 24H volume</span>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            {filteredTokens.map((token) => {
              const isSelected = token.id === selectedTokenId
              const address = TOKEN_ADDRESS_BY_SYMBOL[token.symbol] ?? ""

              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => onSelect(token.id)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                    isSelected ? "bg-surface-1" : "hover:bg-surface-1",
                  )}
                >
                  <TokenBubble visual={token.visual} className="size-9" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-foreground">{token.name}</span>
                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <span>{token.symbol}</span>
                      {address ? <span className="truncate">{address}</span> : null}
                    </div>
                  </div>
                  {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              )
            })}

            {filteredTokens.length === 0 ? (
              <div className="mx-4 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No tokens match that search.
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
