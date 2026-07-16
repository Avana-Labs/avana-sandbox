"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { CircleDollarSign, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroBalanceDisplay } from "@/app/components/charts/hero-balance-display"
import { Progress } from "@/components/ui/progress"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// TODO(backend): wire these to the user's real Avana balance (mirrors the portfolio hero).
const AVANA_BALANCE = "$14,400.00"
const AVANA_BALANCE_DELTA = "-$312.96 (-3.80%)"

// TODO(backend): wire these to real fee accrual once fees ship.
const TOTAL_FEES_EARNED = "$0"
const CLAIMABLE_FEES = "$0"

function AvanaCoin() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand ring-1 ring-brand/20"
      aria-hidden
    >
      <Image
        src="/avana-icon.png"
        alt=""
        width={38}
        height={38}
        className="h-[38px] w-[38px] scale-[1.68] object-contain brightness-0 invert"
        priority
      />
    </div>
  )
}

function FeeCard({
  label,
  value,
  hidden,
  action,
}: {
  label: string
  value: string
  hidden: boolean
  action?: ReactNode
}) {
  return (
    <div className="rounded-radius-md border-0 bg-card px-4 py-4">
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {label}
        <Info className="h-3 w-3" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AvanaCoin />
          <span className="truncate text-[24px] font-normal leading-none tracking-[-0.03em] text-foreground sm:text-[26px]">
            {hidden ? "••••" : value}
          </span>
        </div>
        {action}
      </div>
    </div>
  )
}

export function RewardsBalanceHero({
  completedCount,
  totalCount,
  progressPercentage,
}: {
  completedCount: number
  totalCount: number
  progressPercentage: number
}) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()

  return (
    <div className="mb-6 grid gap-5 md:mb-8 md:gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
      <section className="relative overflow-hidden rounded-radius-md border-0 bg-card px-4 py-4 sm:px-5 md:min-h-[174px]">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />
        <div className="pointer-events-none absolute inset-y-0 -right-12 flex items-center md:-right-20">
          <div
            aria-hidden="true"
            className="size-48 bg-contain bg-center bg-no-repeat opacity-[0.08] brightness-0 dark:invert dark:opacity-[0.06] sm:size-64 md:size-[20rem] md:opacity-[0.09] md:dark:opacity-[0.07]"
            style={{ backgroundImage: "url('/avana-icon.png')" }}
          />
        </div>

        <div className="relative flex flex-col gap-4 md:min-h-[142px] md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <span className="sr-only">{t("AVA balance")}</span>
              <HeroBalanceDisplay
                value={AVANA_BALANCE}
                delta={AVANA_BALANCE_DELTA}
                deltaTone="negative"
                meta="Today"
                hidden={!showDollarAmounts}
                valueSuffix={<AvanaCoin />}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                {t("Your progress")}
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t("{completed}/{total} completed")
                  .replace("{completed}", String(completedCount))
                  .replace("{total}", String(totalCount))}
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-1.5"
              aria-label={t("Overall quest completion progress")}
            />
          </div>
        </div>
      </section>

      <section className="hidden min-w-0 space-y-3 md:block">
        <FeeCard label={t("Total Fees earned")} value={TOTAL_FEES_EARNED} hidden={!showDollarAmounts} />
        <FeeCard
          label={t("Claimable Fees")}
          value={CLAIMABLE_FEES}
          hidden={!showDollarAmounts}
          action={
            <Button type="button" size="sm" disabled className="shrink-0 gap-1.5">
              <CircleDollarSign className="size-4" />
              {t("Claim Fees")}
            </Button>
          }
        />
      </section>
    </div>
  )
}
