"use client"

import { useMediaQuery } from "@/app/lib/use-media-query"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import type { ActionKind } from "@/app/lib/action-system/contracts"

type BorrowActionKind = Extract<ActionKind, "borrow" | "repay" | "supply" | "remove" | "claim">

export function ResponsiveBorrowAction({
  kind,
  market,
  asset,
  amount,
  closeHref,
  label,
  sidebar = false,
}: {
  kind: BorrowActionKind
  market?: string
  asset?: string
  amount?: string
  closeHref: string
  label?: string
  sidebar?: boolean
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  if (isDesktop) {
    const action = (
      <BorrowActionPageClient
        kind={kind}
        embedded
        sidebar={sidebar}
        layout="default"
        closeHref={closeHref}
        initialMarketId={market}
        initialAssetId={asset}
        initialAmount={amount}
      />
    )

    if (sidebar) {
      return <DetailSidebarActionCard>{action}</DetailSidebarActionCard>
    }

    return action
  }

  return (
    <ActionPageLaunchCta
      product="borrow"
      kind={kind}
      market={market}
      asset={asset}
      amount={amount}
      returnTo={closeHref}
      label={label}
    />
  )
}
