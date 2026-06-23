"use client"

import { useMediaQuery } from "@/app/lib/use-media-query"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { LendActionPageClient } from "@/app/components/action-page/lend-action-page-client"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"

export function ResponsiveLendAction({
  kind,
  market,
  closeHref,
  label,
  sidebar = false,
}: {
  kind: "deposit" | "withdraw"
  market: string
  closeHref: string
  label?: string
  sidebar?: boolean
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  if (isDesktop) {
    const action = (
      <LendActionPageClient
        kind={kind}
        embedded
        sidebar={sidebar}
        layout={sidebar ? "home" : "default"}
        closeHref={closeHref}
        initialMarketId={market}
      />
    )

    if (sidebar) {
      return <DetailSidebarActionCard>{action}</DetailSidebarActionCard>
    }

    return action
  }

  return (
    <ActionPageLaunchCta product="lend" kind={kind} market={market} returnTo={closeHref} label={label} />
  )
}
