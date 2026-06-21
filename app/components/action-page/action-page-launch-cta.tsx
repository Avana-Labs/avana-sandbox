"use client"

import Link from "next/link"
import { actionPagePath, getActionDescriptor, type ActionKind, type ActionProduct } from "@/app/lib/action-system/contracts"
import { cn } from "@/lib/utils"

export function ActionPageLaunchCta({
  product,
  kind,
  market,
  asset,
  amount,
  multiplier,
  returnTo,
  className,
  label,
}: {
  product: ActionProduct
  kind: ActionKind
  market?: string
  asset?: string
  amount?: string
  multiplier?: string
  returnTo?: string
  className?: string
  label?: string
}) {
  const descriptor = getActionDescriptor(product, kind)
  const params: Record<string, string> = {}
  if (market) params.market = market
  if (asset) params.asset = asset
  if (amount) params.amount = amount
  if (multiplier) params.multiplier = multiplier
  if (returnTo) params.return = returnTo

  return (
    <Link
      href={actionPagePath(product, kind, params)}
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90",
        className,
      )}
    >
      {label ?? descriptor.primaryVerb}
    </Link>
  )
}
