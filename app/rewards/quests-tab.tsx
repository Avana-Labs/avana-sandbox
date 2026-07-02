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
} from "@/app/lib/data/rewards/catalog"
import { UnderlineTabStrip } from "@/app/components/tab-primitives"
import { Card } from "@/components/ui/card"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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

function AvanaQuestCard({
  quest,
  accent = "default",
  onTaskAction,
}: {
  quest: RewardsQuest & { status?: string; progressLabel?: string }
  accent?: "default" | "challenge"
  onTaskAction: (taskId: string) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const Icon = QUEST_ICON_MAP[quest.iconId]
  const isClaimable = quest.status === "claimable"
  const isDisabled = quest.status === "claimed" || quest.status === "expired" || quest.cta === t("Waiting")
  const canAct = isClaimable || (quest.status === "available" || quest.status === "in_progress") && quest.cta !== t("Waiting")

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-radius-md border-0 bg-card shadow-none">
      <div className="flex h-full flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-radius-md bg-brand/10">
            <Icon className="h-4 w-4 text-brand" strokeWidth={1.9} />
          </div>
          <span className="rounded-full border border-border bg-surface-inset px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/70">
            {t(quest.category)}
          </span>
        </div>

        <div className="mt-3 min-h-0 space-y-2 sm:mt-3.5">
          <h3 className="line-clamp-3 text-[14px] leading-5 tracking-[-0.03em] text-foreground md:text-[15px]">
            {t(quest.title)}
          </h3>
          <p className={`line-clamp-2 text-[12px] font-normal leading-5 ${accent === "challenge" ? "text-foreground/75" : "text-muted-foreground"}`}>
            {t(quest.description)}
          </p>
          {"progressLabel" in quest && quest.progressLabel ? (
            <div className="text-[11px] text-muted-foreground">{t(quest.progressLabel)}</div>
          ) : null}
          <div className="pt-1 font-data text-[14px] tracking-tight text-foreground md:text-[15px]">{quest.reward}</div>
        </div>

        <div className="mt-auto pt-3.5">
          {quest.expiration ? (
            <div className="mb-3.5 flex items-center justify-between gap-3 border-t border-dashed border-border pt-3">
              <span className="text-[10px] font-normal text-muted-foreground">{t("Expiration")}</span>
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
            className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-radius-sm px-3.5 text-[12px] transition-colors ${
              isClaimable
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : isDisabled
                  ? "bg-muted/60 text-muted-foreground"
                  : "border border-brand/20 bg-brand/5 text-foreground hover:bg-brand/10"
            }`}
          >
            {t(quest.cta)}
            {!isDisabled ? <ArrowRight className="h-3.5 w-3.5" /> : null}
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
  const { t } = useTranslation()
  const [activePromoTab, setActivePromoTab] = useState<RewardsPromoTabId>("new-users")

  return (
    <section className="space-y-6">
      <UnderlineTabStrip
        items={promoTabs.map((tab) => ({ id: tab.id, label: t(tab.label) }))}
        value={activePromoTab}
        onChange={setActivePromoTab}
        ariaLabel={t("Rewards quest categories")}
        listClassName="w-max min-w-full gap-6 sm:gap-9"
      />

      {activePromoTab === "new-users" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {questsByTab["new-users"].map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "challenge-tasks" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {questsByTab["challenge-tasks"].map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} accent="challenge" onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : null}

      {activePromoTab === "refer-a-friend" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
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
