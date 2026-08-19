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
  /** Per-task illustration under public/asset-rewards; when absent the card falls back to iconId. */
  image?: string
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
 * education, generic rewards/dashboard/mastery — lands in "Getting started".
 */
const REWARDS_TAB_BY_TASK_ID: Record<string, RewardsPromoTabId> = {
  "supply-5k-lend": "lend",
  "use-curve-position": "borrow",
  "use-uniswap-v4-position": "multiply",
}

/**
 * Per-task illustration (files live in public/asset-rewards). Populated one quest
 * at a time as each card is verified end-to-end; an unmapped id falls back to its
 * tag icon in the card. Rendered via next/image, so the 1254² source is downscaled
 * and served as lazy WebP/AVIF — kilobytes on the wire, not the raw PNG.
 */
const REWARDS_IMAGE_BY_TASK_ID: Record<string, string> = {
  "connect-wallet": "/asset-rewards/2.png",
  "review-risk-basics": "/asset-rewards/1.png",
  "run-first-simulation": "/asset-rewards/13.png",
  "first-lend-deposit": "/asset-rewards/3.png",
  "supply-5k-lend": "/asset-rewards/5.png",
  "first-borrow": "/asset-rewards/6.png",
}

export function imageForTask(taskId: string): string | undefined {
  return REWARDS_IMAGE_BY_TASK_ID[taskId]
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
