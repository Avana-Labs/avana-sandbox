import { REWARDS_PROMO_TABS } from "@/app/lib/data/mock/shared/rewards"
import type { RewardsPromoTabId, RewardsQuest } from "@/app/lib/data/mock/shared/rewards"
import type { BorrowPoolRow } from "@/app/lib/data/mock/shared/borrow"

export type RewardsHeroPoolRow = {
  id: string
  href: string
  pool: BorrowPoolRow
  title: string
  subtitle: string
  value: string
  delta: string
  deltaClassName: string
}

export type RewardsPageData = {
  walletProfileId: string
  totalPools: number
  completedPools: number
  progressPercentage: number
  balanceTotal: number
  rewardPools: RewardsHeroPoolRow[]
  promoTabs: typeof REWARDS_PROMO_TABS
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
}
