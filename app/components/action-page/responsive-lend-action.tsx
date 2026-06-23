"use client"

import { useMediaQuery } from "@/app/lib/use-media-query"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { LendActionPageClient } from "@/app/components/action-page/lend-action-page-client"

export function ResponsiveLendAction({
  kind,
  market,
  closeHref,
  label,
}: {
  kind: "deposit" | "withdraw"
  market: string
  closeHref: string
  label?: string
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  if (isDesktop) {
    return <LendActionPageClient kind={kind} embedded closeHref={closeHref} initialMarketId={market} />
  }

  return (
    <ActionPageLaunchCta product="lend" kind={kind} market={market} returnTo={closeHref} label={label} />
  )
}
