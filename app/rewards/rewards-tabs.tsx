"use client"

import { QuestsTab } from "./quests-tab"
import type { RewardsPromoTabId, RewardsQuest } from "@/app/lib/data/mock/shared/rewards"

export function RewardsTabs({
  promoTabs,
  questsByTab,
  onClaimTask,
}: {
  promoTabs: ReadonlyArray<{ id: RewardsPromoTabId; label: string }>
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
  onClaimTask: (taskId: string) => Promise<unknown>
}) {
  return (
    <div id="rewards-tabs" className="space-y-6">
      <QuestsTab promoTabs={promoTabs} questsByTab={questsByTab} onClaimTask={onClaimTask} />
    </div>
  )
}
