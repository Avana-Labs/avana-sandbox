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
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useMediaQuery } from "@/app/lib/use-media-query"
import type { HomeBorrowToken } from "@/app/lib/borrow-system/home-contracts"

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
  /** Gate the asset picker (e.g. no wallet connected, or no collateral chosen yet).
   *  The pill dims and, when a blocked handler is provided, clicking runs it
   *  (e.g. open the Connect flow) instead of opening the picker. */
  assetPickerDisabled?: boolean
  assetPickerHint?: string
  onAssetPickerBlocked?: () => void
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
  assetPickerDisabled = false,
  assetPickerHint,
  onAssetPickerBlocked,
}: ActionAmountCardProps) {
  const { t } = useTranslation()
  const symbol = assetSymbol ?? assetLabel.split(" ").slice(-1)[0] ?? "Asset"
  // No asset picked yet: the default label is the literal word "Asset". Show a clear
  // "Select Asset" call-to-action (and drop the neutral "?" glyph) instead.
  const isAssetPlaceholder = /^asset$/i.test(assetLabel.trim())
  const displayAssetLabel = isAssetPlaceholder ? t("Select Asset") : assetLabel
  const useDialogPicker = assetPickerVariant === "dialog" && Boolean(pickerTokens && pickerTokens.length > 1)
  const switchable = Boolean(
    !hideAssetSelector &&
    onAssetSelect &&
    !readOnly &&
    (useDialogPicker ? pickerTokens!.length > 1 : assetOptions && assetOptions.length > 1),
  )
  // When gated (no wallet / no collateral), the pill still renders as an interactive
  // control so it can dim and route a click to the blocked handler (e.g. Connect).
  const gated = assetPickerDisabled
  const gatedClickable = gated && Boolean(onAssetPickerBlocked)
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
        "flex w-full items-start gap-2 rounded-radius-md px-2.5 py-2.5 text-left text-[14px] transition-colors hover:bg-hover",
        option.id === selectedAssetId && "bg-surface-inset",
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

  // Wallet balance shown beside the "$0.00" line. Clicking it fills the max amount
  // (replaces the separate "Max" button). The token ticker is dropped from the
  // value — it's already shown in the picker right above it, so repeating it here
  // ("12500 CRVUSD") is redundant.
  const balanceDisplay = balanceValue?.replace(/\s+[A-Za-z][\w.]*$/, "") ?? balanceValue
  const balanceInline =
    balanceValue != null ? (
      onMax && !readOnly ? (
        <button
          type="button"
          onClick={onMax}
          title={t("Use max")}
          className="max-w-full shrink-0 truncate text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t(balanceLabel ?? "Balance")}: <span className="text-foreground">{balanceDisplay}</span>
        </button>
      ) : (
        <div className="max-w-full shrink-0 truncate text-[13px] text-muted-foreground">
          {t(balanceLabel ?? "Balance")}: <span className="text-foreground">{balanceDisplay}</span>
        </div>
      )
    ) : null

  const amountRow = (
    <div className="mt-1.5 flex items-center justify-between gap-3 max-[360px]:flex-col max-[360px]:items-start">
      {readOnly ? (
        <div
          className={cn(
            "min-w-0 flex-1 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em]",
            amount && amount !== "0" ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {amount || "0"}
        </div>
      ) : (
        <label className="min-w-0 flex-1 max-[360px]:w-full">
          <span className="sr-only">{t("{label} amount").replace("{label}", t(label))}</span>
          <input
            type="text"
            inputMode="decimal"
            // Numbers-only: numeric keypad on mobile (never the alphabet), and no
            // OS autofill/spellcheck that could inject letters. Any non-digit is
            // stripped on change (covers typing AND paste) by sanitizeDecimalInput.
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={amount}
            onChange={(event) => onAmountChange(sanitizeDecimalInput(event.target.value))}
            className={cn(
              "w-full border-0 bg-transparent p-0 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] outline-none placeholder:text-muted-foreground/60",
              amount && amount !== "0" ? "text-foreground" : "text-muted-foreground/60",
            )}
            placeholder="0"
          />
        </label>
      )}
      {!hideAssetSelector ? (
        <div className="relative shrink-0 max-[360px]:self-end" ref={switchable ? menuRef : undefined}>
          {unitLabel ? (
            <div className="inline-flex cursor-default items-center rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-medium text-foreground">
              <span>{unitLabel}</span>
            </div>
          ) : switchable || gated ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (gated) {
                  onAssetPickerBlocked?.()
                  return
                }
                if (useDialogPicker) setDialogOpen(true)
                else setMenuOpen((open) => !open)
              }}
              // Deterministic across SSR/client: the options are a role="listbox"
              // in both the desktop popover and the mobile sheet, so don't key this
              // off the client-only viewport query (that caused a hydration mismatch).
              aria-haspopup={!gated && !useDialogPicker ? "listbox" : undefined}
              aria-expanded={!gated && !useDialogPicker ? menuOpen : undefined}
              aria-label={t("Change asset, current {asset}").replace("{asset}", assetLabel)}
              disabled={readOnly || (gated && !gatedClickable)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-medium text-foreground hover:bg-surface-hover",
                gated ? (gatedClickable ? "opacity-60" : "cursor-default opacity-60") : "cursor-pointer",
              )}
            >
              {borrowSymbol ? (
                <ActionTokenPairIcon collateralSymbol={symbol} borrowSymbol={borrowSymbol} size="md" />
              ) : isAssetPlaceholder ? null : (
                <ActionTokenIcon symbol={symbol} />
              )}
              {showAssetLabel ? <span>{displayAssetLabel}</span> : null}
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            </button>
          ) : (
            <div className="inline-flex cursor-default items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[14px] font-medium text-foreground">
              {borrowSymbol ? (
                <ActionTokenPairIcon collateralSymbol={symbol} borrowSymbol={borrowSymbol} size="md" />
              ) : isAssetPlaceholder ? null : (
                <ActionTokenIcon symbol={symbol} />
              )}
              {showAssetLabel ? <span>{displayAssetLabel}</span> : null}
            </div>
          )}
          {switchable && !gated && !useDialogPicker && menuOpen && !useMenuSheet ? (
            <div
              role="listbox"
              aria-label={t("Select asset")}
              className="absolute right-0 top-full z-50 mt-2 max-h-56 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-radius-lg border border-border bg-popover p-1 shadow-elev-3"
            >
              {assetOptions!.map((option) => renderAssetOption(option))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  const usdRow = (
    <div className="mt-1 flex items-center justify-between gap-3 text-[14px]">
      <div className="min-w-0 truncate text-foreground/60">
        <AnimatedTextValue text={approxUsdLabel} />
      </div>
      {balanceInline}
    </div>
  )

  const gatedHintRow =
    gated && assetPickerHint ? (
      <div className="mt-1.5 text-[13px] text-muted-foreground">{t(assetPickerHint)}</div>
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
          <DialogTitle className="text-[13px] font-medium">{t("Select asset")}</DialogTitle>
        </DialogHeader>
        <div
          role="listbox"
          aria-label={t("Select asset")}
          className="max-h-[60dvh] overflow-y-auto px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          {assetOptions?.map((option) => renderAssetOption(option))}
        </div>
      </DialogContent>
    </Dialog>
  ) : null

  if (variant === "inset" || variant === "raised") {
    return (
      <>
        <SwapStyleField
          label={t(label)}
          tone={variant === "raised" ? "raised" : "inset"}
          className={cn(showReceiveWethToggle || footer ? "rounded-b-none" : undefined)}
          data-testid="action-amount-card"
        >
          {amountRow}
          {usdRow}
          {gatedHintRow}
          {showReceiveWethToggle ? (
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[14px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>{t("Receive WETH")}</span>
                <ActionMetricHelp topic="Receive WETH" text="Get wrapped ETH (WETH) instead of native ETH." />
              </div>
              <button
                type="button"
                role="switch"
                aria-label={t("Receive WETH")}
                aria-checked={receiveWeth}
                onClick={() => onReceiveWethChange?.(!receiveWeth)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  receiveWeth ? "bg-foreground" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-5 rounded-full bg-background transition-transform",
                    receiveWeth ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
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
        className="rounded-radius-xl border border-transparent bg-field-bottom text-card-foreground"
        data-testid="action-amount-card"
      >
        <div className="px-4 pb-4 pt-4">
          <div className="text-[14px] font-medium text-muted-foreground">{t(label)}</div>
          {amountRow}
          {usdRow}
          {gatedHintRow}
        </div>

        {showReceiveWethToggle ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[14px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{t("Receive WETH")}</span>
              <ActionMetricHelp
                topic="Receive WETH"
                text="Receive borrowed ETH as WETH instead of native ETH when repaying or withdrawing."
              />
            </div>
            <button
              type="button"
              role="switch"
              aria-label={t("Receive WETH")}
              aria-checked={receiveWeth}
              onClick={() => onReceiveWethChange?.(!receiveWeth)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                receiveWeth ? "bg-foreground" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 rounded-full bg-background transition-transform",
                  receiveWeth ? "translate-x-5" : "translate-x-0.5",
                )}
              />
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
  primaryLabelSymbol,
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  primaryHref,
  secondaryHref,
  primaryDisabled,
  primaryPending,
  sticky = false,
  className,
}: {
  primaryLabel: string
  /** Token ticker for the "Insufficient {symbol}" CTA — interpolated after
   *  translation so the label localizes while the ticker stays verbatim. */
  primaryLabelSymbol?: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  primaryHref?: string
  secondaryHref?: string
  primaryDisabled?: boolean
  primaryPending?: boolean
  /** Pin the CTA row to a sticky bottom bar on mobile so it isn't buried below
   *  full-width metric cards. Resets to a normal in-flow row at md+. */
  sticky?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const primaryClassName = primaryCtaClass({ disabled: primaryDisabled, pending: primaryPending })
  const secondaryClassName = SECONDARY_CTA_CLASS
  const primaryText = t(primaryLabel).replace("{symbol}", primaryLabelSymbol ?? "")

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        sticky &&
          "sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
      data-testid="action-footer"
    >
      {secondaryHref && !onSecondary ? (
        <Link href={secondaryHref} className={secondaryClassName}>
          {t(secondaryLabel)}
        </Link>
      ) : (
        <button type="button" onClick={onSecondary} className={secondaryClassName}>
          {t(secondaryLabel)}
        </button>
      )}
      {primaryHref && !onPrimary ? (
        <Link href={primaryHref} className={primaryClassName} data-testid="action-footer-primary">
          {primaryPending ? t("Processing…") : primaryText}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled || primaryPending}
          className={primaryClassName}
          data-testid="action-footer-primary"
        >
          {primaryPending ? t("Processing…") : primaryText}
        </button>
      )}
    </div>
  )
}
