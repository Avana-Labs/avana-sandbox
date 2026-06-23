"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"
import type { HomeBorrowToken } from "@/app/lib/home-sim"

export type ActionAssetOption = {
  id: string
  label: string
  symbol: string
  borrowSymbol?: string
  sublabel?: string
}

type ActionAmountCardProps = {
  label: string
  amount: string
  onAmountChange: (value: string) => void
  approxUsdLabel: string
  assetLabel: string
  assetSymbol?: string
  borrowSymbol?: string
  balanceLabel?: string
  balanceValue?: string
  readOnly?: boolean
  receiveWeth?: boolean
  onReceiveWethChange?: (value: boolean) => void
  showReceiveWethToggle?: boolean
  footer?: ReactNode
  assetOptions?: ActionAssetOption[]
  selectedAssetId?: string
  onAssetSelect?: (id: string) => void
  variant?: "card" | "inset"
  hideAssetSelector?: boolean
  assetPickerVariant?: "menu" | "dialog"
  pickerTokens?: HomeBorrowToken[]
}

export function ActionAmountCard({
  label,
  amount,
  onAmountChange,
  approxUsdLabel,
  assetLabel,
  assetSymbol,
  borrowSymbol,
  readOnly = false,
  receiveWeth = false,
  onReceiveWethChange,
  showReceiveWethToggle = false,
  footer,
  assetOptions,
  selectedAssetId,
  onAssetSelect,
  variant = "card",
  hideAssetSelector = false,
  assetPickerVariant = "menu",
  pickerTokens,
}: ActionAmountCardProps) {
  const symbol = assetSymbol ?? assetLabel.split(" ").slice(-1)[0] ?? "Asset"
  const useDialogPicker = assetPickerVariant === "dialog" && Boolean(pickerTokens && pickerTokens.length > 1)
  const switchable = Boolean(!hideAssetSelector && onAssetSelect && assetOptions && assetOptions.length > 1 && !readOnly)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [menuOpen])

  const amountRow = (
    <div className="mt-3 flex items-center justify-between gap-3">
      {readOnly ? (
        <div className="min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
          {amount || "0"}
        </div>
      ) : (
        <label className="min-w-0 flex-1">
          <span className="sr-only">{label} amount</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="w-full border-0 bg-transparent p-0 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="0"
          />
        </label>
      )}
      {!hideAssetSelector ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={
              switchable
                ? () => {
                    if (useDialogPicker) setDialogOpen(true)
                    else setMenuOpen((open) => !open)
                  }
                : undefined
            }
            aria-haspopup={switchable && !useDialogPicker ? "listbox" : undefined}
            aria-expanded={switchable && !useDialogPicker ? menuOpen : undefined}
            aria-label={switchable ? `Change asset, current ${assetLabel}` : undefined}
            disabled={readOnly && !switchable}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium",
              switchable ? "cursor-pointer hover:bg-muted" : "cursor-default",
            )}
          >
            {borrowSymbol ? (
              <ActionTokenPairIcon collateralSymbol={symbol} borrowSymbol={borrowSymbol} size="md" />
            ) : (
              <ActionTokenIcon symbol={symbol} />
            )}
            <span>{assetLabel}</span>
            {switchable ? <span className="text-muted-foreground" aria-hidden>▾</span> : null}
          </button>
          {switchable && !useDialogPicker && menuOpen ? (
            <div
              role="listbox"
              aria-label="Select asset"
              className="absolute right-0 z-50 mt-2 max-h-64 w-72 overflow-auto rounded-2xl border border-border bg-surface-raised p-1 shadow-lg"
            >
              {assetOptions!.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === selectedAssetId}
                  onClick={() => {
                    onAssetSelect!(option.id)
                    setMenuOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[14px] hover:bg-muted",
                    option.id === selectedAssetId && "bg-muted",
                  )}
                >
                  {option.borrowSymbol ? (
                    <ActionTokenPairIcon collateralSymbol={option.symbol} borrowSymbol={option.borrowSymbol} size="md" />
                  ) : (
                    <ActionTokenIcon symbol={option.symbol} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.sublabel ? <span className="shrink-0 text-[12px] text-muted-foreground">{option.sublabel}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const usdRow = <div className="mt-2 text-[13px] text-muted-foreground">{approxUsdLabel}</div>

  const assetPickerDialog =
    useDialogPicker && switchable && pickerTokens ? (
      <TokenPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedTokenId={selectedAssetId ?? null}
        tokens={pickerTokens}
        onSelect={(tokenId) => {
          onAssetSelect!(tokenId)
          setDialogOpen(false)
        }}
      />
    ) : null

  if (variant === "inset") {
    return (
      <>
        <SwapStyleField label={label} tone="inset" className={cn(showReceiveWethToggle || footer ? "rounded-b-none" : undefined)} data-testid="action-amount-card">
          {amountRow}
          {usdRow}
        {showReceiveWethToggle ? (
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[14px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Receive WETH</span>
              <ActionMetricHelp
                topic="Receive WETH"
                text="Receive borrowed ETH as WETH instead of native ETH when repaying or withdrawing."
              />
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Receive WETH"
              aria-checked={receiveWeth}
              onClick={() => onReceiveWethChange?.(!receiveWeth)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                receiveWeth ? "bg-foreground" : "bg-muted",
              )}
            >
              <span className={cn("inline-block size-5 rounded-full bg-background transition-transform", receiveWeth ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
        ) : null}
        {footer ? <div className="mt-3 border-t border-border/60 pt-3">{footer}</div> : null}
        </SwapStyleField>
        {assetPickerDialog}
      </>
    )
  }

  return (
    <>
      <div
        className="rounded-radius-md border border-border bg-card"
        data-testid="action-amount-card"
      >
      <div className="px-4 pb-4 pt-4">
        <div className="text-[13px] text-muted-foreground">{label}</div>
        {amountRow}
        {usdRow}
      </div>

      {showReceiveWethToggle ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[14px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Receive WETH</span>
            <ActionMetricHelp
              topic="Receive WETH"
              text="Receive borrowed ETH as WETH instead of native ETH when repaying or withdrawing."
            />
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Receive WETH"
            aria-checked={receiveWeth}
            onClick={() => onReceiveWethChange?.(!receiveWeth)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              receiveWeth ? "bg-foreground" : "bg-muted",
            )}
          >
            <span className={cn("inline-block size-5 rounded-full bg-background transition-transform", receiveWeth ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
      ) : null}

      {footer ? <div className="border-t border-border">{footer}</div> : null}
      </div>
      {assetPickerDialog}
    </>
  )
}

export function ActionFooter({
  primaryLabel,
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  primaryHref,
  secondaryHref,
  primaryDisabled,
  primaryPending,
  className,
}: {
  primaryLabel: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  primaryHref?: string
  secondaryHref?: string
  primaryDisabled?: boolean
  primaryPending?: boolean
  className?: string
}) {
  const primaryClassName = cn(
    "flex h-12 items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
    primaryPending && "opacity-70",
  )
  const secondaryClassName =
    "flex h-12 items-center justify-center rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted"

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)} data-testid="action-footer">
      {secondaryHref && !onSecondary ? (
        <Link href={secondaryHref} className={secondaryClassName}>
          {secondaryLabel}
        </Link>
      ) : (
        <button type="button" onClick={onSecondary} className={secondaryClassName}>
          {secondaryLabel}
        </button>
      )}
      {primaryHref && !onPrimary ? (
        <Link href={primaryHref} className={primaryClassName}>
          {primaryPending ? "Processing…" : primaryLabel}
        </Link>
      ) : (
        <button type="button" onClick={onPrimary} disabled={primaryDisabled || primaryPending} className={primaryClassName}>
          {primaryPending ? "Processing…" : primaryLabel}
        </button>
      )}
    </div>
  )
}
