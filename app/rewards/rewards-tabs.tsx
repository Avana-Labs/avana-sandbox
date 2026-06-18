"use client"

import type { RewardsPageData } from "@/app/lib/data/providers/rewards"
import { QuestsTab } from "./quests-tab"

/** Rewards page content now uses the Avana-specific quest groups directly as the only tabs. */
export function RewardsTabs({ pageData }: { pageData: RewardsPageData }) {
  return (
    <div id="rewards-tabs" className="space-y-6">
      <QuestsTab promoTabs={pageData.promoTabs} questsByTab={pageData.questsByTab} />
    </div>
  )
}
