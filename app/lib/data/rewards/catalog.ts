export type RewardsPromoTabId = "getting-started" | "lend" | "borrow" | "multiply" | "referrals"

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
  { id: "lend", label: "Lend" },
  { id: "borrow", label: "Borrow" },
  { id: "multiply", label: "Multiply" },
  { id: "referrals", label: "Referrals" },
] as const satisfies ReadonlyArray<{ id: RewardsPromoTabId; label: string }>

/** Max quest cards shown per product tab; extra claimable quests still claim via the rail. */
export const REWARDS_QUESTS_PER_TAB = 6

/**
 * Group a reward task under one of the product tabs. Product-tagged quests route
 * by tag; cross-cutting quests (volume, activity, risk, integration, streak) are
 * pinned by id to the product they exercise. Everything else — wallet setup,
 * education, generic rewards/portfolio/mastery — lands in "Getting started".
 */
const REWARDS_TAB_BY_TASK_ID: Record<string, RewardsPromoTabId> = {
  "supply-5k-lend": "lend",
  "borrow-2k": "borrow",
  "complete-5-borrow-repay-cycles": "borrow",
  "maintain-hf-above-2": "borrow",
  "use-curve-position": "borrow",
  "use-uniswap-v4-position": "borrow",
  "complete-3-multiply-deleverage-cycles": "multiply",
  "4-week-activity-streak": "multiply",
  "referral-cohort-25k": "referrals",
  "referral-streak": "referrals",
}

export function resolveRewardsPromoTab(task: { id: string; tag: string }): RewardsPromoTabId {
  const pinned = REWARDS_TAB_BY_TASK_ID[task.id]
  if (pinned) return pinned
  switch (task.tag) {
    case "lend":
      return "lend"
    case "borrow":
      return "borrow"
    case "multiply":
      return "multiply"
    case "referral":
      return "referrals"
    default:
      return "getting-started"
  }
}

export function emptyRewardsQuestsByTab<T>(): Record<RewardsPromoTabId, T[]> {
  return {
    "getting-started": [],
    lend: [],
    borrow: [],
    multiply: [],
    referrals: [],
  }
}
