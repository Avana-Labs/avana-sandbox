"use client"

import { useEffect, useState } from "react"
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
} from "@/app/components/icons"
import { type RewardsPromoTabId, type RewardsQuestIconId, type RewardsQuest } from "@/app/lib/data/rewards/catalog"
import { UnderlineTabStrip } from "@/app/components/tab-primitives"
import { Card } from "@/components/ui/card"
import { LendAccountSection } from "./lend-account-section"
import { BorrowAccountSection } from "./borrow-account-section"
import { MultiplyAccountSection } from "./multiply-account-section"
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
  const canAct =
    isClaimable || ((quest.status === "available" || quest.status === "in_progress") && quest.cta !== t("Waiting"))

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
          <p
            className={`line-clamp-2 text-[12px] font-normal leading-5 ${accent === "challenge" ? "text-foreground/75" : "text-muted-foreground"}`}
          >
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
              <span className="font-data text-[10px] font-normal tracking-tight text-foreground">
                {quest.expiration}
              </span>
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
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-radius-sm px-3.5 text-[13px] font-bold transition-colors [&_svg]:size-4 ${
              isClaimable
                ? "bg-brand text-white hover:bg-brand/90"
                : isDisabled
                  ? "bg-muted/60 text-muted-foreground"
                  : "border border-brand/20 bg-brand/5 text-foreground hover:bg-brand/10"
            }`}
          >
            {t(quest.cta)}
            {!isDisabled ? <ArrowRight /> : null}
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
  const [activePromoTab, setActivePromoTab] = useState<RewardsPromoTabId>(promoTabs[0]?.id ?? "getting-started")

  useEffect(() => {
    const activateFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash === "dashboard-borrow-account") setActivePromoTab("borrow")
      if (hash === "dashboard-lend-account") setActivePromoTab("lend")
      if (hash === "dashboard-multiply-account") setActivePromoTab("multiply")
    }

    activateFromHash()
    window.addEventListener("hashchange", activateFromHash)
    return () => window.removeEventListener("hashchange", activateFromHash)
  }, [])

  return (
    <section className="space-y-6">
      <UnderlineTabStrip
        items={promoTabs.map((tab) => ({ id: tab.id, label: t(tab.label) }))}
        value={activePromoTab}
        onChange={setActivePromoTab}
        ariaLabel={t("Rewards quest categories")}
        listClassName="w-max min-w-full gap-6 px-2 sm:gap-9 sm:px-0"
      />

      <RewardsPromoContent activePromoTab={activePromoTab} questsByTab={questsByTab} onTaskAction={onTaskAction} />
    </section>
  )
}

export function RewardsPromoContent({
  activePromoTab,
  questsByTab,
  onTaskAction,
  returnHref = "/dashboard",
}: {
  activePromoTab: RewardsPromoTabId
  questsByTab: Record<RewardsPromoTabId, RewardsQuest[]>
  onTaskAction: (taskId: string) => Promise<unknown>
  returnHref?: string
}) {
  const { t } = useTranslation()
  const activeQuests = questsByTab[activePromoTab] ?? []
  const rewardsSectionTitle =
    activePromoTab === "borrow"
      ? t("Borrow Rewards")
      : activePromoTab === "multiply"
        ? t("Multiply Rewards")
        : null

  return (
    <>
      {activePromoTab === "lend" ? <LendAccountSection returnHref={returnHref} /> : null}
      {activePromoTab === "borrow" ? <BorrowAccountSection returnHref={returnHref} /> : null}
      {activePromoTab === "multiply" ? <MultiplyAccountSection returnHref={returnHref} /> : null}

      {activeQuests.length > 0 ? (
        <div className="space-y-4">
          {rewardsSectionTitle ? (
            <div>
              <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
                {rewardsSectionTitle}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("{count} rewards").replace("{count}", String(activeQuests.length))}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeQuests.map((quest) => (
              <AvanaQuestCard key={quest.id} quest={quest} onTaskAction={onTaskAction} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("No quests here yet — check back soon.")}</p>
      )}
    </>
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
