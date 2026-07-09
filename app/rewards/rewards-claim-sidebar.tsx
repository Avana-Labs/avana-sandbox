"use client"

import { RewardsActionPageClient } from "@/app/components/action-page/rewards-action-page-client"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { useTranslation } from "@/app/lib/i18n/use-translation"

/**
 * Detail-page-style action rail for the rewards page: the claim flow baked into
 * the sidebar the same way Deposit/Withdraw live in the lend detail sidebar.
 * Desktop only — the mobile equivalent is the sticky action bar on the page.
 */
export function RewardsClaimSidebar() {
  const { t } = useTranslation()
  return (
    <aside className="flex w-full flex-col" aria-label={t("Claim rewards")}>
      <ActionWorkspaceTabs
        items={[{ id: "claim", label: "Claim" }]}
        value="claim"
        onChange={() => {}}
        ariaLabel={t("Rewards actions")}
      />
      <div className="mt-3">
        <DetailSidebarActionCard>
          <RewardsActionPageClient embedded sidebar closeHref="/rewards" />
        </DetailSidebarActionCard>
      </div>
    </aside>
  )
}
