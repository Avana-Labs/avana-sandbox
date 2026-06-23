"use client"

import { useMediaQuery } from "@/app/lib/use-media-query"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { MultiplyActionPageClient } from "@/app/components/action-page/multiply-action-page-client"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import type { MultiplyActionKind } from "@/app/lib/action-system/contracts"

export function ResponsiveMultiplyAction({
  kind,
  market,
  closeHref,
  label,
  sidebar = false,
  initialMultiplier,
}: {
  kind: MultiplyActionKind
  market: string
  closeHref: string
  label?: string
  sidebar?: boolean
  initialMultiplier?: string
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  if (isDesktop) {
    const action = (
      <MultiplyActionPageClient
        kind={kind}
        embedded
        sidebar={sidebar}
        layout={sidebar ? "home" : "default"}
        closeHref={closeHref}
        initialMarketId={market}
        initialMultiplier={initialMultiplier}
      />
    )

    if (sidebar) {
      return <DetailSidebarActionCard>{action}</DetailSidebarActionCard>
    }

    return action
  }

  return (
    <ActionPageLaunchCta product="multiply" kind={kind} market={market} returnTo={closeHref} label={label} />
  )
}
