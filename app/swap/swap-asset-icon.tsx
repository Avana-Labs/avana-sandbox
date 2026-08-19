import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"
import type { SwapAsset } from "@/app/lib/swap-system"

/**
 * Icon for a swap asset. LP tokens render a two-token PAIR icon from their underlying
 * symbols — the LP pair label ("ETH/USDC LP") is in no icon registry, so a single
 * ActionTokenIcon fell back to "EU" initials. Everything else renders its single token icon.
 */
export function SwapAssetIcon({ asset, className }: { asset: SwapAsset; className?: string }) {
  if (asset.isLpToken && asset.lpUnderlyingSymbols) {
    const [collateralSymbol, borrowSymbol] = asset.lpUnderlyingSymbols
    return (
      <ActionTokenPairIcon
        collateralSymbol={collateralSymbol}
        borrowSymbol={borrowSymbol}
        size="sm"
        className={className}
      />
    )
  }
  return <ActionTokenIcon symbol={asset.symbol} className={className} />
}
