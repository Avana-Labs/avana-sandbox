"use client"

import { UmbrellaActionPageClient } from "@/app/components/action-page/umbrella-action-page-client"
import { ResponsiveDetailAction } from "@/app/components/action-page/responsive-detail-action"

export function ResponsiveUmbrellaAction({
  kind,
  market,
  closeHref,
  label,
  sidebar = false,
}: {
  kind: "stake" | "claim" | "cooldown" | "unstake"
  market: string
  closeHref: string
  label?: string
  sidebar?: boolean
}) {
  return (
    <ResponsiveDetailAction
      product="umbrella"
      kind={kind}
      market={market}
      closeHref={closeHref}
      label={label}
      sidebar={sidebar}
    >
      <UmbrellaActionPageClient
        kind={kind}
        embedded
        sidebar={sidebar}
        closeHref={closeHref}
        initialMarketId={market}
      />
    </ResponsiveDetailAction>
  )
}
