"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import { SwapStyleField } from "@/app/components/action-page/swap-style-field"
import { primaryCtaClass, SECONDARY_CTA_CLASS } from "@/app/components/action-page/action-cta"
import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { sanitizeDecimalInput } from "@/app/lib/action-system/amount-input"
import { useMediaQuery } from "@/app/lib/use-media-query"
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
  unitLabel?: string
  assetSymbol?: string
  borrowSymbol?: string
  balanceLabel?: string
  balanceValue?: string
  onMax?: () => void
  readOnly?: boolean
  receiveWeth?: boolean
  onReceiveWethChange?: (value: boolean) => void
  showReceiveWethToggle?: boolean
  footer?: ReactNode
  assetOptions?: ActionAssetOption[]
  selectedAssetId?: string
  onAssetSelect?: (id: string) => void
  variant?: "card" | "inset" | "raised"
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
  unitLabel,
  assetSymbol,
  borrowSymbol,
  balanceLabel,
  balanceValue,
  onMax,
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
  const switchable = Boolean(
    !hideAssetSelector &&
      onAssetSelect &&
      !readOnly &&
      (useDialogPicker ? pickerTokens!.length > 1 : assetOptions && assetOptions.length > 1),
  )
  const showAssetLabel = !(borrowSymbol && variant !== "card") || !switchable
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // On mobile the inline "menu" selector opens as a bottom-sheet (matching the
  // dialog picker and the search sheet); the anchored popover stays on desktop.
  const isDesktop = useMediaQuery("(min-width: 640px)", true)
  const useMenuSheet = switchable && !useDialogPicker && !isDesktop

  useEffect(() => {
    // The mobile sheet is a Radix Dialog and manages its own dismissal; only the
    // anchored desktop popover needs the manual outside-click/escape handling.
    if (!menuOpen || useMenuSheet) return undefined

    const handlePointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointer)
      document.addEventListener("keydown", handleKey)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener("pointerdown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [menuOpen, useMenuSheet])

  const renderAssetOption = (option: ActionAssetOption) => (
    <button
      key={option.id}
      type="button"
      role="option"
      aria-selected={option.id === selectedAssetId}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onAssetSelect!(option.id)
        setMenuOpen(false)
      }}
      className={cn(
        "flex w-full items-start gap-2 rounded-xl px-2.5 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-hover",
        option.id === selectedAssetId && "bg-surface-hover",
      )}
    >
      {option.borrowSymbol ? (
        <ActionTokenPairIcon collateralSymbol={option.symbol} borrowSymbol={option.borrowSymbol} size="md" />
      ) : (
        <ActionTokenIcon symbol={option.symbol} />
      )}
      <span className="min-w-0 flex-1 break-words leading-snug text-foreground">{option.label}</span>
      {option.sublabel ? <span className="shrink-0 text-[13px] text-muted-foreground">{option.sublabel}</span> : null}
    </button>
  )

  const amountRow = (
    <div className="mt-3 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
      {readOnly ? (
        <div className="min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
          {amount || "0"}
        </div>
      ) : (
        <label className="min-w-0 flex-1 max-[360px]:w-full">
          <span className="sr-only">{label} amount</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(sanitizeDecimalInput(event.target.value))}
            className="w-full border-0 bg-transparent p-0 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground outline-none placeholder:text-muted-foreground/60"
            placeholder="0"
          />
        </label>
      )}
      {!hideAssetSelector ? (
        <div className="relative shrink-0 max-[360px]:self-end" ref={switchable ? menuRef : undefined}>
          {unitLabel ? (
            <div className="inline-flex cursor-default items-center rounded-full border border-border bg-surface-raised px-3 py-2 text-[14px] font-medium text-foreground">
              <span>{unitLabel}</span>
            </div>
          ) : switchable ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (useDialogPicker) setDialogOpen(true)
                else setMenuOpen((open) => !open)
              }}
              aria-haspopup={useDialogPicker ? undefined : useMenuSheet ? "dialog" : "listbox"}
              aria-expanded={!useDialogPicker ? menuOpen : undefined}
              aria-label={`Change asset, current ${assetLabel}`}
              disabled={readOnly}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-[14px] font-medium text-foreground cursor-pointer hover:bg-surface-hover"
            >
              {borrowSymbol ? (
                <ActionTokenPairIcon collateralSymbol={symbol} borrowSymbol={borrowSymbol} size="md" />
              ) : (
                <ActionTokenIcon symbol={symbol} />
              )}
              {showAssetLabel ? <span>{assetLabel}</span> : null}
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            </button>
          ) : (
            <div
              className="inline-flex cursor-default items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-[14px] font-medium text-foreground"
            >
              {borrowSymbol ? (
                <ActionTokenPairIcon collateralSymbol={symbol} borrowSymbol={borrowSymbol} size="md" />
              ) : (
                <ActionTokenIcon symbol={symbol} />
              )}
              {showAssetLabel ? <span>{assetLabel}</span> : null}
            </div>
          )}
          {switchable && !useDialogPicker && menuOpen && !useMenuSheet ? (
            <div
              role="listbox"
              aria-label="Select asset"
              className="absolute right-0 top-full z-50 mt-2 max-h-56 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-border bg-popover p-1 shadow-elev-3"
            >
              {assetOptions!.map((option) => renderAssetOption(option))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const usdRow = (
    <div className="mt-2 text-[14px] text-foreground/60">
      <AnimatedTextValue text={approxUsdLabel} />
    </div>
  )

  const balanceRow =
    balanceValue != null ? (
      <div className="mt-3 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="min-w-0 truncate">
          {balanceLabel ?? "Balance"}: <span className="text-foreground/80">{balanceValue}</span>
        </span>
        {onMax && !readOnly ? (
          <button
            type="button"
            onClick={onMax}
            className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-border bg-surface-raised px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            Max
          </button>
        ) : null}
      </div>
    ) : null

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

  const menuSheet = useMenuSheet ? (
    <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
      <DialogContent className="max-w-lg gap-0 p-0 pt-2 sm:max-w-[420px]">
        <DialogHeader className="px-4 pb-2 pt-3 text-left space-y-0">
          <DialogTitle className="text-[13px] font-medium">Select asset</DialogTitle>
        </DialogHeader>
        <div role="listbox" aria-label="Select asset" className="max-h-[60dvh] overflow-y-auto px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {assetOptions?.map((option) => renderAssetOption(option))}
        </div>
      </DialogContent>
    </Dialog>
  ) : null

  if (variant === "inset" || variant === "raised") {
    return (
      <>
        <SwapStyleField
          label={label}
          tone={variant === "raised" ? "raised" : "inset"}
          className={cn(showReceiveWethToggle || footer ? "rounded-b-none" : undefined)}
          data-testid="action-amount-card"
        >
          {amountRow}
          {usdRow}
          {balanceRow}
        {showReceiveWethToggle ? (
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[14px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Receive WETH</span>
              <ActionMetricHelp topic="Receive WETH" text="Get wrapped ETH (WETH) instead of native ETH." />
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
        {menuSheet}
      </>
    )
  }

  return (
    <>
      <div
        className="rounded-[20px] border border-border/80 bg-card text-card-foreground"
        data-testid="action-amount-card"
      >
      <div className="px-4 pb-4 pt-4">
        <div className="text-[14px] font-medium text-muted-foreground">{label}</div>
        {amountRow}
        {usdRow}
        {balanceRow}
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
      {menuSheet}
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
  const primaryClassName = primaryCtaClass({ disabled: primaryDisabled, pending: primaryPending })
  const secondaryClassName = SECONDARY_CTA_CLASS

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
