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
import {
  type RewardsPromoTabId,
  type RewardsQuestIconId,
  type RewardsQuest,
} from "@/app/lib/data/mock/shared/rewards"
import { Card } from "@/components/ui/card"

const QUEST_ICON_MAP: Record<RewardsQuestIconId, typeof Wallet> = {
  droplets: Droplets,
  flame: Flame,
  layers3: Layers3,
  link2: Link2,
  lockKeyhole: LockKeyhole,
  orbit: Orbit,
  repeat2: Repeat2,
  rocket: Rocket,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  wallet: Wallet,
}

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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-state={active ? "active" : "inactive"}
      className={[
        "h-auto flex-1 shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[16px] font-normal after:inset-x-0 after:h-[3px] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none sm:flex-none sm:pb-4 sm:text-[15px]",
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function AvanaQuestCard({
  quest,
  accent = "default",
  onTaskAction,
}: {
  quest: RewardsQuest & { status?: string; progressLabel?: string }
  accent?: "default" | "challenge"
  onTaskAction: (taskId: string) => Promise<unknown>
}) {
  const Icon = QUEST_ICON_MAP[quest.iconId]
  const isClaimable = quest.status === "claimable"
  const isDisabled = quest.status === "claimed" || quest.status === "expired" || quest.cta === "Waiting"
  const canAct = isClaimable || (quest.status === "available" || quest.status === "in_progress") && quest.cta !== "Waiting"

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-[14px] border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex h-full flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-[11px] ${accent === "challenge" ? "bg-[#EAFF72]/90" : "bg-[#9CDD4C]/14"}`}>
            <Icon className={`h-4 w-4 ${accent === "challenge" ? "text-[#5A6618]" : "text-[#2D6B4A]"}`} strokeWidth={1.9} />
          </div>
          <span className="rounded-full border border-border bg-surface-inset px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/70">
            {quest.category}
          </span>
        </div>

        <div className="mt-3.5 min-h-[132px] space-y-2">
          <h3 className="line-clamp-2 text-[14px] font-medium leading-5 tracking-[-0.03em] text-foreground md:text-[15px]">
            {quest.title}
          </h3>
          <p className={`line-clamp-2 text-[12px] font-normal leading-5 ${accent === "challenge" ? "text-foreground/75" : "text-muted-foreground"}`}>
            {quest.description}
          </p>
          {"progressLabel" in quest && quest.progressLabel ? (
            <div className="text-[11px] font-medium text-muted-foreground">{quest.progressLabel}</div>
          ) : null}
          <div className="pt-1 font-data text-[14px] font-medium tracking-tight text-foreground md:text-[15px]">{quest.reward}</div>
        </div>

        <div className="mt-auto pt-3.5">
          {quest.expiration ? (
            <div className="mb-3.5 flex items-center justify-between gap-3 border-t border-dashed border-border pt-3">
              <span className="text-[10px] font-normal text-muted-foreground">Expiration</span>
              <span className="font-data text-[10px] font-normal tracking-tight text-foreground">{quest.expiration}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (canAct) {
                void onTaskAction(quest.id)
              }
            }}
            disabled={isDisabled}
            className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-[11px] px-3.5 text-[12px] font-medium transition-colors ${
              isClaimable
                ? "bg-[#9CDD4C] text-[#163300] hover:bg-[#8fd341]"
                : isDisabled
                  ? "bg-muted/60 text-muted-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {quest.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function RewardsPromoPanel({
  promoTabs,
  questsByTab,
  onTaskAction,
}: {
  promoTabs: ReadonlyArray<{ id: RewardsPromoTabId; label: string }>
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
  onTaskAction: (taskId: string) => Promise<unknown>
}) {
  const [activePromoTab, setActivePromoTab] = useState<RewardsPromoTabId>("new-users")

  return (
    <section className="space-y-6">
      <div className="max-w-full overflow-x-auto overscroll-x-contain border-b border-border/90 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9" role="tablist" aria-label="Rewards quest categories">
          {promoTabs.map((tab) => (
            <PromoTabButton
              key={tab.id}
              active={activePromoTab === tab.id}
              onClick={() => setActivePromoTab(tab.id)}
            >
              {tab.label}
            </PromoTabButton>
          ))}
        </div>
      </div>

      {activePromoTab === "new-users" ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {questsByTab["new-users"].map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "challenge-tasks" ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {questsByTab["challenge-tasks"].map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} accent="challenge" onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "refer-a-friend" ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {questsByTab["refer-a-friend"].map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** Rewards quests surface: Avana-specific onboarding and challenge task tabs. */
export function QuestsTab({
  promoTabs,
  questsByTab,
  onTaskAction,
}: {
  promoTabs: ReadonlyArray<{ id: RewardsPromoTabId; label: string }>
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
  onTaskAction: (taskId: string) => Promise<unknown>
}) {
  return (
    <div className="space-y-6">
      <RewardsPromoPanel promoTabs={promoTabs} questsByTab={questsByTab} onTaskAction={onTaskAction} />
    </div>
  )
}
