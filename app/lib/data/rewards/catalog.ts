export type RewardsPromoTabId = "new-users" | "challenge-tasks" | "refer-a-friend"

export type RewardsQuestIconId =
  | "droplets"
  | "flame"
  | "layers3"
  | "link2"
  | "lockKeyhole"
  | "orbit"
  | "repeat2"
  | "rocket"
  | "shieldCheck"
  | "sparkles"
  | "target"
  | "trophy"
  | "wallet"

export type RewardsQuest = {
  id: string
  title: string
  description: string
  reward: string
  cta: string
  category: string
  iconId: RewardsQuestIconId
  expiration?: string
}

export const REWARDS_PROMO_TABS = [
  { id: "new-users", label: "New users" },
  { id: "challenge-tasks", label: "Challenge tasks" },
  { id: "refer-a-friend", label: "Refer a friend" },
] as const satisfies ReadonlyArray<{ id: RewardsPromoTabId; label: string }>
