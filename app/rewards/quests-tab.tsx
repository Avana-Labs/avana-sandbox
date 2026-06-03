"use client"

import { useState } from "react"
import {
  ArrowRight,
  Droplets,
  Flame,
  Layers3,
  Link2,
  LockKeyhole,
  Orbit,
  Repeat2,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react"
import { Card } from "@/components/ui/card"

type PromoTabId = "new-users" | "challenge-tasks" | "refer-a-friend"

type AvanaQuest = {
  id: string
  title: string
  description: string
  reward: string
  cta: string
  category: string
  icon: typeof Wallet
  expiration?: string
}

const PROMO_TABS = [
  { id: "new-users", label: "New Users Exclusive" },
  { id: "challenge-tasks", label: "Challenge Tasks" },
  { id: "refer-a-friend", label: "Refer a Friend" },
] as const

const NEW_USER_QUESTS: AvanaQuest[] = [
  {
    id: "wallet-connect",
    title: "Connect your wallet",
    description: "Start your Avana profile and unlock the quest board.",
    reward: "25 AVA",
    cta: "Connect",
    category: "Setup",
    icon: Wallet,
  },
  {
    id: "profile-complete",
    title: "Complete profile setup",
    description: "Finish preferences and security settings for your account.",
    reward: "20 AVA",
    cta: "Finish setup",
    category: "Setup",
    icon: ShieldCheck,
  },
  {
    id: "first-supply",
    title: "Make your first supply",
    description: "Supply collateral into any supported Avana pool.",
    reward: "40 AVA",
    cta: "Supply",
    category: "Onchain",
    icon: Droplets,
  },
  {
    id: "first-borrow",
    title: "Open your first borrow",
    description: "Borrow against LP collateral and activate your account.",
    reward: "50 AVA",
    cta: "Borrow",
    category: "Onchain",
    icon: Rocket,
  },
  {
    id: "first-repay",
    title: "Complete your first repay",
    description: "Repay any active loan position on Avana.",
    reward: "25 AVA",
    cta: "Repay",
    category: "Onchain",
    icon: Repeat2,
  },
  {
    id: "first-claim",
    title: "Claim your first rewards",
    description: "Claim accumulated Avana rewards from any eligible pool.",
    reward: "30 AVA",
    cta: "Claim",
    category: "Rewards",
    icon: Sparkles,
  },
  {
    id: "bridge-liquidity",
    title: "Bridge to a supported chain",
    description: "Move collateral to one additional supported network.",
    reward: "35 AVA",
    cta: "Bridge",
    category: "Cross-chain",
    icon: Orbit,
  },
  {
    id: "stake-ava",
    title: "Stake AVA",
    description: "Stake AVA to activate staking-tier progression.",
    reward: "45 AVA",
    cta: "Stake",
    category: "Staking",
    icon: LockKeyhole,
  },
  {
    id: "invite-user",
    title: "Invite one user",
    description: "Share your referral link and onboard one new wallet.",
    reward: "30 AVA",
    cta: "Invite",
    category: "Referral",
    icon: Link2,
  },
  {
    id: "second-pool",
    title: "Use a second pool",
    description: "Supply or borrow in a second distinct collateral market.",
    reward: "35 AVA",
    cta: "Explore pools",
    category: "Exploration",
    icon: Layers3,
  },
  {
    id: "health-factor-safe",
    title: "Maintain safe health factor",
    description: "Keep portfolio health factor above 2.0 for 7 days.",
    reward: "40 AVA",
    cta: "View health",
    category: "Risk",
    icon: ShieldCheck,
  },
  {
    id: "add-favorite-pool",
    title: "Favorite a pool",
    description: "Save one pool to your watchlist for easier tracking.",
    reward: "10 AVA",
    cta: "Favorite",
    category: "Setup",
    icon: Target,
  },
  {
    id: "read-risk-warning",
    title: "Review risk warning",
    description: "Read the LP collateral risk briefing from the protocol.",
    reward: "10 AVA",
    cta: "Read",
    category: "Education",
    icon: ShieldCheck,
  },
  {
    id: "connect-second-chain",
    title: "Add a second chain",
    description: "Connect and authorize one more supported chain wallet.",
    reward: "20 AVA",
    cta: "Add chain",
    category: "Cross-chain",
    icon: Orbit,
  },
  {
    id: "first-week-streak",
    title: "7-day activity streak",
    description: "Check in and complete one action for seven straight days.",
    reward: "60 AVA",
    cta: "Continue streak",
    category: "Streak",
    icon: Flame,
  },
]

const CHALLENGE_QUESTS: AvanaQuest[] = [
  {
    id: "supply-5k",
    title: "Supply $5K in LP collateral",
    description: "Reach $5,000 total supplied collateral across Avana pools.",
    reward: "120 AVA",
    cta: "Supply more",
    category: "Volume",
    icon: Droplets,
    expiration: "224 : 0 : 58 : 47",
  },
  {
    id: "borrow-2k",
    title: "Borrow $2K with LP collateral",
    description: "Open and maintain $2,000 in borrowed value across markets.",
    reward: "90 AVA",
    cta: "Borrow",
    category: "Volume",
    icon: Rocket,
    expiration: "223 : 16 : 58 : 47",
  },
  {
    id: "multi-chain-three",
    title: "Deploy on 3 chains",
    description: "Open active positions across three supported chain environments.",
    reward: "140 AVA",
    cta: "Expand",
    category: "Cross-chain",
    icon: Orbit,
    expiration: "223 : 16 : 58 : 47",
  },
  {
    id: "curve-aave-route",
    title: "Use a Curve-origin position",
    description: "Supply one Curve LP position and borrow against it on Avana.",
    reward: "70 AVA",
    cta: "Use Curve",
    category: "Integrations",
    icon: Layers3,
    expiration: "219 : 11 : 12 : 03",
  },
  {
    id: "uniswap-route",
    title: "Use a Uniswap v4 position",
    description: "Collateralize one Uniswap v4 LP position on the protocol.",
    reward: "70 AVA",
    cta: "Use Uniswap",
    category: "Integrations",
    icon: Layers3,
    expiration: "219 : 11 : 12 : 03",
  },
  {
    id: "claim-five-times",
    title: "Claim rewards 5 times",
    description: "Accumulate and claim AVA rewards across five separate actions.",
    reward: "80 AVA",
    cta: "Claim",
    category: "Rewards",
    icon: Sparkles,
    expiration: "212 : 04 : 48 : 31",
  },
  {
    id: "referrals-three",
    title: "Refer 3 active users",
    description: "Bring three wallets that each complete at least one supply.",
    reward: "150 AVA",
    cta: "Invite",
    category: "Referral",
    icon: Link2,
    expiration: "230 : 08 : 41 : 10",
  },
  {
    id: "safe-hf-month",
    title: "Hold HF above 2.2 for 30 days",
    description: "Maintain disciplined risk while keeping collateral productive.",
    reward: "110 AVA",
    cta: "Monitor HF",
    category: "Risk",
    icon: ShieldCheck,
    expiration: "201 : 14 : 09 : 52",
  },
  {
    id: "borrow-repeat",
    title: "Complete 10 borrow / repay cycles",
    description: "Cycle capital efficiently without a liquidation event.",
    reward: "95 AVA",
    cta: "Cycle positions",
    category: "Activity",
    icon: Repeat2,
    expiration: "204 : 19 : 33 : 05",
  },
  {
    id: "ava-stake-tier",
    title: "Reach AVA staking tier 2",
    description: "Stake enough AVA to unlock the second staking band.",
    reward: "100 AVA",
    cta: "Stake AVA",
    category: "Staking",
    icon: LockKeyhole,
    expiration: "240 : 00 : 00 : 00",
  },
  {
    id: "five-pools",
    title: "Activate 5 collateral pools",
    description: "Open positions in five separate supported collateral pools.",
    reward: "130 AVA",
    cta: "Open positions",
    category: "Exploration",
    icon: Layers3,
    expiration: "217 : 03 : 27 : 44",
  },
  {
    id: "weekly-streak-4",
    title: "4-week activity streak",
    description: "Perform at least one protocol action every week for four weeks.",
    reward: "120 AVA",
    cta: "Keep streak",
    category: "Streak",
    icon: Flame,
    expiration: "228 : 06 : 30 : 18",
  },
  {
    id: "protocol-ambassador",
    title: "Complete Avana orientation set",
    description: "Finish docs, risk primer, first supply, and first borrow tasks.",
    reward: "85 AVA",
    cta: "Complete set",
    category: "Education",
    icon: Target,
    expiration: "226 : 12 : 15 : 55",
  },
  {
    id: "portfolio-growth",
    title: "Grow portfolio value by $10K",
    description: "Increase total managed collateral value by at least $10,000.",
    reward: "160 AVA",
    cta: "Grow portfolio",
    category: "Volume",
    icon: Rocket,
    expiration: "236 : 02 : 10 : 07",
  },
  {
    id: "vault-master",
    title: "Open 8 active positions",
    description: "Reach eight concurrent active positions across supported markets.",
    reward: "180 AVA",
    cta: "Open more",
    category: "Mastery",
    icon: Sparkles,
    expiration: "233 : 21 : 44 : 12",
  },
]

const REFERRAL_QUESTS: AvanaQuest[] = [
  {
    id: "share-link",
    title: "Share your referral link",
    description: "Generate and share your Avana referral link with your network.",
    reward: "15 AVA",
    cta: "Copy link",
    category: "Referral",
    icon: Link2,
  },
  {
    id: "first-referral",
    title: "Invite your first wallet",
    description: "Get one referred wallet to connect and activate a profile.",
    reward: "40 AVA",
    cta: "Invite",
    category: "Referral",
    icon: Wallet,
  },
  {
    id: "first-funded-referral",
    title: "First funded referral",
    description: "Have one referred user complete their first collateral supply.",
    reward: "60 AVA",
    cta: "Track referral",
    category: "Referral",
    icon: Droplets,
  },
  {
    id: "three-referrals",
    title: "Bring 3 active users",
    description: "Onboard three referred users who each complete one onchain action.",
    reward: "120 AVA",
    cta: "Grow network",
    category: "Referral",
    icon: Target,
  },
  {
    id: "five-referrals",
    title: "Bring 5 active users",
    description: "Reach five active referred wallets using Avana product flows.",
    reward: "180 AVA",
    cta: "Invite more",
    category: "Referral",
    icon: Sparkles,
  },
  {
    id: "referral-volume",
    title: "Referral cohort supplies $25K",
    description: "Have your referred cohort reach $25,000 in combined supplied collateral.",
    reward: "220 AVA",
    cta: "View cohort",
    category: "Volume",
    icon: Layers3,
  },
  {
    id: "referral-borrowers",
    title: "3 referred borrowers go live",
    description: "Get three referred users to open their first borrow positions.",
    reward: "140 AVA",
    cta: "Monitor activity",
    category: "Referral",
    icon: Rocket,
  },
  {
    id: "cross-chain-referrals",
    title: "Cross-chain referral mix",
    description: "Onboard referred users across two or more supported chains.",
    reward: "160 AVA",
    cta: "Expand reach",
    category: "Cross-chain",
    icon: Orbit,
  },
  {
    id: "referral-streak",
    title: "Referral streak",
    description: "Bring one new active referred wallet per week for four consecutive weeks.",
    reward: "200 AVA",
    cta: "Keep streak",
    category: "Streak",
    icon: Flame,
  },
  {
    id: "referral-ambassador",
    title: "Become an Avana ambassador",
    description: "Reach 10 active referred wallets and maintain healthy participation.",
    reward: "300 AVA",
    cta: "Unlock tier",
    category: "Ambassador",
    icon: Trophy,
  },
]

function PromoTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "border-b-2 pb-2 text-left text-[16px] font-medium tracking-[-0.02em] transition-colors md:text-[18px]",
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function AvanaQuestCard({ quest, accent = "default" }: { quest: AvanaQuest; accent?: "default" | "challenge" }) {
  const Icon = quest.icon

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-[18px] border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${accent === "challenge" ? "bg-[#EAFF72]/90" : "bg-[#9CDD4C]/14"}`}>
            <Icon className={`h-5 w-5 ${accent === "challenge" ? "text-[#7D8D24]" : "text-[#4E9D73]"}`} strokeWidth={1.9} />
          </div>
          <span className="rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {quest.category}
          </span>
        </div>

        <div className="mt-5">
          <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-foreground">{quest.title}</h3>
          <p className={`mt-2 text-[14px] leading-6 ${accent === "challenge" ? "text-[#4E9D73]" : "text-muted-foreground"}`}>
            {quest.description}
          </p>
        </div>

        <div className="mt-5 font-data text-[18px] font-semibold tracking-tight text-foreground">{quest.reward}</div>

        <div className="mt-auto pt-6">
          {quest.expiration ? (
            <div className="mb-4 flex items-center justify-between gap-3 border-t border-dashed border-border pt-4">
              <span className="text-[12px] text-muted-foreground">Expiration</span>
              <span className="font-data text-[12px] font-medium tracking-tight text-foreground">{quest.expiration}</span>
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-[12px] bg-muted px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            {quest.cta}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function RewardsPromoPanel() {
  const [activePromoTab, setActivePromoTab] = useState<PromoTabId>("new-users")

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-8 border-b border-border/50">
        {PROMO_TABS.map((tab) => (
          <PromoTabButton
            key={tab.id}
            active={activePromoTab === tab.id}
            onClick={() => setActivePromoTab(tab.id)}
          >
            {tab.label}
          </PromoTabButton>
        ))}
      </div>

      {activePromoTab === "new-users" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground md:text-[18px]">
            <Sparkles className="h-4.5 w-4.5 text-[#01AACF]" />
            <span>Starter path: complete onboarding, first-position, and first-rewards quests on Avana.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {NEW_USER_QUESTS.map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "challenge-tasks" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground md:text-[18px]">
            <Trophy className="h-4.5 w-4.5 text-[#D7A33D]" />
            <span>Time-boxed growth, volume, and cross-chain quests for power users.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CHALLENGE_QUESTS.map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} accent="challenge" />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "refer-a-friend" ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[16px] font-semibold tracking-[-0.03em] text-foreground md:text-[18px]">
            <Link2 className="h-4.5 w-4.5 text-[#01AACF]" />
            <span>Referral quests for growing your Avana network and activating new wallets.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {REFERRAL_QUESTS.map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** Rewards quests surface: Avana-specific onboarding and challenge task tabs. */
export function QuestsTab() {
  return (
    <div className="space-y-6">
      <RewardsPromoPanel />
    </div>
  )
}
