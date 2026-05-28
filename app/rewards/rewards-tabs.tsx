"use client"

import { QuestsTab } from "./quests-tab"

/** Rewards page content now uses the Avana-specific quest groups directly as the only tabs. */
export function RewardsTabs() {
  return (
    <div id="rewards-tabs" className="space-y-6">
      <QuestsTab />
    </div>
  )
}
