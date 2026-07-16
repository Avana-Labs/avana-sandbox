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

export const REWARDS_BALANCE_TOTAL = 14_400

export const REWARDS_PROMO_TABS = [
  { id: "lend", label: "Lend" },
  { id: "borrow", label: "Borrow" },
  { id: "multiply", label: "Multiply" },
  { id: "referrals", label: "Referrals" },
] as const satisfies ReadonlyArray<{ id: RewardsPromoTabId; label: string }>

export const NEW_USER_QUESTS: RewardsQuest[] = [
  {
    id: "wallet-connect",
    title: "Connect your wallet",
    description: "Start your Avana profile and unlock the quest board.",
    reward: "25 AVA",
    cta: "Connect",
    category: "Setup",
    iconId: "wallet",
  },
  {
    id: "profile-complete",
    title: "Complete profile setup",
    description: "Finish preferences and security settings for your account.",
    reward: "20 AVA",
    cta: "Finish setup",
    category: "Setup",
    iconId: "shieldCheck",
  },
  {
    id: "first-supply",
    title: "Make your first supply",
    description: "Supply collateral into any supported Avana pool.",
    reward: "40 AVA",
    cta: "Supply",
    category: "Onchain",
    iconId: "droplets",
  },
  {
    id: "first-borrow",
    title: "Open your first borrow",
    description: "Borrow against LP collateral and activate your account.",
    reward: "50 AVA",
    cta: "Borrow",
    category: "Onchain",
    iconId: "rocket",
  },
  {
    id: "first-repay",
    title: "Complete your first repay",
    description: "Repay any active loan position on Avana.",
    reward: "25 AVA",
    cta: "Repay",
    category: "Onchain",
    iconId: "repeat2",
  },
  {
    id: "first-claim",
    title: "Claim your first rewards",
    description: "Claim accumulated Avana rewards from any eligible pool.",
    reward: "30 AVA",
    cta: "Claim",
    category: "Rewards",
    iconId: "sparkles",
  },
  {
    id: "bridge-liquidity",
    title: "Bridge to a supported chain",
    description: "Move collateral to one additional supported network.",
    reward: "35 AVA",
    cta: "Bridge",
    category: "Cross-chain",
    iconId: "orbit",
  },
  {
    id: "stake-ava",
    title: "Stake AVA",
    description: "Stake AVA to activate staking-tier progression.",
    reward: "45 AVA",
    cta: "Stake",
    category: "Staking",
    iconId: "lockKeyhole",
  },
  {
    id: "invite-user",
    title: "Invite one user",
    description: "Share your referral link and onboard one new wallet.",
    reward: "30 AVA",
    cta: "Invite",
    category: "Referral",
    iconId: "link2",
  },
  {
    id: "second-pool",
    title: "Use a second pool",
    description: "Supply or borrow in a second distinct collateral market.",
    reward: "35 AVA",
    cta: "Explore pools",
    category: "Exploration",
    iconId: "layers3",
  },
  {
    id: "health-factor-safe",
    title: "Maintain safe health factor",
    description: "Keep portfolio health factor above 2.0 for 7 days.",
    reward: "40 AVA",
    cta: "View health",
    category: "Risk",
    iconId: "shieldCheck",
  },
  {
    id: "add-favorite-pool",
    title: "Favorite a pool",
    description: "Save one pool to your watchlist for easier tracking.",
    reward: "10 AVA",
    cta: "Favorite",
    category: "Setup",
    iconId: "target",
  },
  {
    id: "read-risk-warning",
    title: "Review risk warning",
    description: "Read the LP collateral risk briefing from the protocol.",
    reward: "10 AVA",
    cta: "Read",
    category: "Education",
    iconId: "shieldCheck",
  },
  {
    id: "connect-second-chain",
    title: "Add a second chain",
    description: "Connect and authorize one more supported chain wallet.",
    reward: "20 AVA",
    cta: "Add chain",
    category: "Cross-chain",
    iconId: "orbit",
  },
  {
    id: "first-week-streak",
    title: "7-day activity streak",
    description: "Check in and complete one action for seven straight days.",
    reward: "60 AVA",
    cta: "Continue streak",
    category: "Streak",
    iconId: "flame",
  },
]

export const CHALLENGE_QUESTS: RewardsQuest[] = [
  {
    id: "supply-5k",
    title: "Supply $5K in LP collateral",
    description: "Reach $5,000 total supplied collateral across Avana pools.",
    reward: "120 AVA",
    cta: "Supply more",
    category: "Volume",
    iconId: "droplets",
    expiration: "224 : 0 : 58 : 47",
  },
  {
    id: "borrow-2k",
    title: "Borrow $2K with LP collateral",
    description: "Open and maintain $2,000 in borrowed value across markets.",
    reward: "90 AVA",
    cta: "Borrow",
    category: "Volume",
    iconId: "rocket",
    expiration: "223 : 16 : 58 : 47",
  },
  {
    id: "multi-chain-three",
    title: "Deploy on 3 chains",
    description: "Open active positions across three supported chain environments.",
    reward: "140 AVA",
    cta: "Expand",
    category: "Cross-chain",
    iconId: "orbit",
    expiration: "223 : 16 : 58 : 47",
  },
  {
    id: "curve-aave-route",
    title: "Use a Curve-origin position",
    description: "Supply one Curve LP position and borrow against it on Avana.",
    reward: "70 AVA",
    cta: "Use Curve",
    category: "Integrations",
    iconId: "layers3",
    expiration: "219 : 11 : 12 : 03",
  },
  {
    id: "uniswap-route",
    title: "Use a Uniswap v4 position",
    description: "Collateralize one Uniswap v4 LP position on the protocol.",
    reward: "70 AVA",
    cta: "Use Uniswap",
    category: "Integrations",
    iconId: "layers3",
    expiration: "219 : 11 : 12 : 03",
  },
  {
    id: "claim-five-times",
    title: "Claim rewards 5 times",
    description: "Accumulate and claim AVA rewards across five separate actions.",
    reward: "80 AVA",
    cta: "Claim",
    category: "Rewards",
    iconId: "sparkles",
    expiration: "212 : 04 : 48 : 31",
  },
  {
    id: "referrals-three",
    title: "Refer 3 active users",
    description: "Bring three wallets that each complete at least one supply.",
    reward: "150 AVA",
    cta: "Invite",
    category: "Referral",
    iconId: "link2",
    expiration: "230 : 08 : 41 : 10",
  },
  {
    id: "safe-hf-month",
    title: "Hold HF above 2.2 for 30 days",
    description: "Maintain disciplined risk while keeping collateral productive.",
    reward: "110 AVA",
    cta: "Monitor HF",
    category: "Risk",
    iconId: "shieldCheck",
    expiration: "201 : 14 : 09 : 52",
  },
  {
    id: "borrow-repeat",
    title: "Complete 10 borrow / repay cycles",
    description: "Cycle capital efficiently without a liquidation event.",
    reward: "95 AVA",
    cta: "Cycle positions",
    category: "Activity",
    iconId: "repeat2",
    expiration: "204 : 19 : 33 : 05",
  },
  {
    id: "ava-stake-tier",
    title: "Reach AVA staking tier 2",
    description: "Stake enough AVA to unlock the second staking band.",
    reward: "100 AVA",
    cta: "Stake AVA",
    category: "Staking",
    iconId: "lockKeyhole",
    expiration: "240 : 00 : 00 : 00",
  },
  {
    id: "five-pools",
    title: "Activate 5 collateral pools",
    description: "Open positions in five separate supported collateral pools.",
    reward: "130 AVA",
    cta: "Open positions",
    category: "Exploration",
    iconId: "layers3",
    expiration: "217 : 03 : 27 : 44",
  },
  {
    id: "weekly-streak-4",
    title: "4-week activity streak",
    description: "Perform at least one protocol action every week for four weeks.",
    reward: "120 AVA",
    cta: "Keep streak",
    category: "Streak",
    iconId: "flame",
    expiration: "228 : 06 : 30 : 18",
  },
  {
    id: "protocol-ambassador",
    title: "Complete Avana orientation set",
    description: "Finish docs, risk primer, first supply, and first borrow tasks.",
    reward: "85 AVA",
    cta: "Complete set",
    category: "Education",
    iconId: "target",
    expiration: "226 : 12 : 15 : 55",
  },
  {
    id: "portfolio-growth",
    title: "Grow portfolio value by $10K",
    description: "Increase total managed collateral value by at least $10,000.",
    reward: "160 AVA",
    cta: "Grow portfolio",
    category: "Volume",
    iconId: "rocket",
    expiration: "236 : 02 : 10 : 07",
  },
  {
    id: "vault-master",
    title: "Open 8 active positions",
    description: "Reach eight concurrent active positions across supported markets.",
    reward: "180 AVA",
    cta: "Open more",
    category: "Mastery",
    iconId: "sparkles",
    expiration: "233 : 21 : 44 : 12",
  },
]

export const REFERRAL_QUESTS: RewardsQuest[] = [
  {
    id: "share-link",
    title: "Share your referral link",
    description: "Generate and share your Avana referral link with your network.",
    reward: "15 AVA",
    cta: "Copy link",
    category: "Referral",
    iconId: "link2",
  },
  {
    id: "first-referral",
    title: "Invite your first wallet",
    description: "Get one referred wallet to connect and activate a profile.",
    reward: "40 AVA",
    cta: "Invite",
    category: "Referral",
    iconId: "wallet",
  },
  {
    id: "first-funded-referral",
    title: "First funded referral",
    description: "Have one referred user complete their first collateral supply.",
    reward: "60 AVA",
    cta: "Track referral",
    category: "Referral",
    iconId: "droplets",
  },
  {
    id: "three-referrals",
    title: "Bring 3 active users",
    description: "Onboard three referred users who each complete one onchain action.",
    reward: "120 AVA",
    cta: "Grow network",
    category: "Referral",
    iconId: "target",
  },
  {
    id: "five-referrals",
    title: "Bring 5 active users",
    description: "Reach five active referred wallets using Avana product flows.",
    reward: "180 AVA",
    cta: "Invite more",
    category: "Referral",
    iconId: "sparkles",
  },
  {
    id: "referral-volume",
    title: "Referral cohort supplies $25K",
    description: "Have your referred cohort reach $25,000 in combined supplied collateral.",
    reward: "220 AVA",
    cta: "View cohort",
    category: "Volume",
    iconId: "layers3",
  },
  {
    id: "referral-borrowers",
    title: "3 referred borrowers go live",
    description: "Get three referred users to open their first borrow positions.",
    reward: "140 AVA",
    cta: "Monitor activity",
    category: "Referral",
    iconId: "rocket",
  },
  {
    id: "cross-chain-referrals",
    title: "Cross-chain referral mix",
    description: "Onboard referred users across two or more supported chains.",
    reward: "160 AVA",
    cta: "Expand reach",
    category: "Cross-chain",
    iconId: "orbit",
  },
  {
    id: "referral-streak",
    title: "Referral streak",
    description: "Bring one new active referred wallet per week for four consecutive weeks.",
    reward: "200 AVA",
    cta: "Keep streak",
    category: "Streak",
    iconId: "flame",
  },
  {
    id: "referral-ambassador",
    title: "Become an Avana ambassador",
    description: "Reach 10 active referred wallets and maintain healthy participation.",
    reward: "300 AVA",
    cta: "Unlock tier",
    category: "Ambassador",
    iconId: "trophy",
  },
]

const ALL_MOCK_QUESTS: RewardsQuest[] = [...NEW_USER_QUESTS, ...CHALLENGE_QUESTS, ...REFERRAL_QUESTS]

/** Route each demo quest to a product tab by its icon/category shorthand. */
function mockQuestTab(quest: RewardsQuest): RewardsPromoTabId {
  if (REFERRAL_QUESTS.includes(quest) || quest.iconId === "link2") return "referrals"
  if (quest.iconId === "droplets") return "lend"
  if (quest.iconId === "rocket" || quest.iconId === "repeat2") return "borrow"
  if (quest.iconId === "layers3") return "multiply"
  return "getting-started"
}

export const REWARDS_QUESTS_BY_TAB: Record<RewardsPromoTabId, RewardsQuest[]> = ALL_MOCK_QUESTS.reduce(
  (result, quest) => {
    result[mockQuestTab(quest)].push(quest)
    return result
  },
  {
    "getting-started": [] as RewardsQuest[],
    lend: [] as RewardsQuest[],
    borrow: [] as RewardsQuest[],
    multiply: [] as RewardsQuest[],
    referrals: [] as RewardsQuest[],
  } as Record<RewardsPromoTabId, RewardsQuest[]>,
)

export const mockRewardsSharedSource = {
  getBalanceTotal() {
    return REWARDS_BALANCE_TOTAL
  },
  getPromoTabs() {
    return REWARDS_PROMO_TABS
  },
  getQuests(tabId: RewardsPromoTabId) {
    return REWARDS_QUESTS_BY_TAB[tabId]
  },
  getAllQuests() {
    return REWARDS_QUESTS_BY_TAB
  },
}
