"use client"

import { useMemo, useState } from "react"
import { Search } from "@/app/components/icons"
import { TokenIcon } from "@/app/components/token-icon"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { SwapAsset, UserAssetBalance } from "@/app/lib/swap-system"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function SwapAssetPickerDialog({
  open,
  onOpenChange,
  title,
  assets,
  balances,
  selectedAssetId,
  excludedAssetId,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  assets: SwapAsset[]
  balances: UserAssetBalance[]
  selectedAssetId: string
  excludedAssetId: string
  onSelect: (assetId: string) => void
}) {
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const [query, setQuery] = useState("")
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return assets.filter(
      (asset) =>
        asset.id !== excludedAssetId &&
        (!normalized ||
          asset.symbol.toLowerCase().includes(normalized) ||
          asset.name.toLowerCase().includes(normalized)),
    )
  }, [assets, excludedAssetId, query])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <DialogContent className="flex max-h-[min(680px,calc(100dvh-48px))] w-full max-w-[520px] flex-col gap-0 overflow-hidden rounded-radius-xl border-border bg-card p-0 sm:w-[calc(100vw-24px)]">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-[15px] font-semibold">{t(title)}</DialogTitle>
          <label className="mt-4 flex h-12 items-center gap-3 rounded-radius-lg border border-border bg-surface-inset px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Find an asset")}
              aria-label={t("Find an asset")}
              className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </DialogHeader>

        <div className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("Supported assets")}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {filteredAssets.map((asset) => {
            const balance = balances.find((item) => item.assetId === asset.id && item.sourceType === "wallet")?.amount
            const amount = balance ?? 0
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  onSelect(asset.id)
                  onOpenChange(false)
                  setQuery("")
                }}
                className="flex w-full items-center gap-3 rounded-radius-md px-3 py-3 text-left transition-colors hover:bg-hover"
              >
                <TokenIcon symbol={asset.symbol} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-foreground">{asset.name}</span>
                  <span className="block text-[12px] text-muted-foreground">{asset.symbol}</span>
                </span>
                <span className="text-right">
                  <span className="block font-data text-[13px] font-medium text-foreground">
                    {amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}
                  </span>
                  <span className="block font-data text-[12px] text-muted-foreground">
                    {exact(amount * asset.priceUsd)}
                  </span>
                </span>
                {asset.id === selectedAssetId ? <span className="sr-only">{t("Selected")}</span> : null}
              </button>
            )
          })}
          {filteredAssets.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">{t("No assets found.")}</div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
