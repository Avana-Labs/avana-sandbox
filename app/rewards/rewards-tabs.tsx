"use client"

import { QuestsTab } from "./quests-tab"
import type { RewardsPromoTabId, RewardsQuest } from "@/app/lib/data/rewards/catalog"

export function RewardsTabs({
  promoTabs,
  questsByTab,
  onTaskAction,
}: {
  promoTabs: ReadonlyArray<{ id: RewardsPromoTabId; label: string }>
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
  onTaskAction: (taskId: string) => Promise<unknown>
}) {
  return (
    <div id="rewards-tabs" className="space-y-6">
      <QuestsTab promoTabs={promoTabs} questsByTab={questsByTab} onTaskAction={onTaskAction} />
    </div>
  )
}
