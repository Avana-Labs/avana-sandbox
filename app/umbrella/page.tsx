"use client"

import { useState } from "react"
import Link from "next/link"
import { Circle, CircleArrowUp, Coins, ShieldCheck, Umbrella, Unlock } from "@/app/components/icons"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { ActionAmountCard } from "@/app/components/action-page/action-amount-card"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { ActionCard, ActionInfoRow } from "@/app/components/action-page/action-metrics"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import { DetailActionTabs } from "@/app/components/detail-action-tabs"
import { ActionIcon } from "@/app/components/action-icon"
import { detailSectionStackClass, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TransactionHistoryCard } from "@/app/borrow/_detail/asset-sections/TransactionHistoryCard"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { AmountVisibilityToggle } from "@/app/components/amount-visibility-toggle"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import type { TxHistoryRow } from "@/app/lib/borrow-detail"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"

const learnCards = [
  {
    title: "Isolated slashing",
    body: "Each Umbrella stake token covers deficits for its matching borrowed asset on the same network.",
    icon: ShieldCheck,
  },
  {
    title: "Dynamic rewards",
    body: "Emissions adjust against target liquidity, and each staked asset can earn multiple reward tokens.",
    icon: Coins,
  },
  {
    title: "Cooldown",
    body: "Start cooldown before withdrawing. During cooldown, the position keeps earning incentives and remains slashable.",
    icon: Circle,
  },
  {
    title: "Withdrawal window",
    body: "After cooldown completes, there is a short window to unstake. If it expires, cooldown must be started again.",
    icon: Unlock,
  },
  {
    title: "Unstake window",
    body: "Once cooldown finishes, users can unstake during the withdrawal window before cooldown has to be restarted.",
    icon: CircleArrowUp,
  },
  {
    title: "Module assets",
    body: "Umbrella positions are split by asset and network, so each stake token has its own risk and reward profile.",
    icon: Umbrella,
  },
]

function UmbrellaHero() {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const umbrella = useUmbrellaSessionContext()
  const totalMarketStakedUsd = umbrella.marketOrder.reduce((sum, id) => sum + umbrella.markets[id].totalStakedUsd, 0)
  const totalStakedUsd = umbrella.marketOrder.reduce((sum, id) => sum + umbrella.positions[id].valueUsd, 0)
  const weightedApy =
    totalStakedUsd > 0
      ? umbrella.marketOrder.reduce((sum, id) => sum + umbrella.positions[id].valueUsd * umbrella.markets[id].apy, 0) /
        totalStakedUsd
      : 0
  const cooldownUsd = umbrella.marketOrder
    .filter((id) => umbrella.positions[id].cooldownStatus === "cooling")
    .reduce((sum, id) => sum + umbrella.positions[id].cooldownValueUsd, 0)
  const readyUsd = umbrella.marketOrder
    .filter((id) => umbrella.positions[id].cooldownStatus === "ready")
    .reduce((sum, id) => sum + umbrella.positions[id].cooldownValueUsd, 0)
  const userUmbrellaSnapshot = [
    { label: "Your Umbrella stake", value: formatUsd(totalStakedUsd), change: `${formatCompactUsd(totalMarketStakedUsd)} market`, tone: "positive" },
    { label: "Weighted APY", value: `${formatPct(weightedApy)}%`, change: "live mix", tone: "positive" },
    { label: "In cooldown", value: formatCompactUsd(cooldownUsd), change: `${formatPct((cooldownUsd / totalStakedUsd) * 100)}%`, tone: "warning" },
    { label: "Withdrawal ready", value: formatCompactUsd(readyUsd), change: readyUsd > 0 ? "USDT" : "none", tone: "positive" },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Your Umbrella
        </h2>
        <AmountVisibilityToggle />
      </div>
      <section className="relative overflow-hidden rounded-radius-md bg-card px-4 py-5 dark:bg-white/[0.04] sm:px-5">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-20 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1.2px)]" />
        <div className="relative">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {userUmbrellaSnapshot.map((item) => (
              <div key={item.label} className="min-w-0 lg:px-5 first:lg:pl-0 last:lg:pr-0">
                <div className="text-[13px] text-muted-foreground">{item.label}</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
                    {showDollarAmounts ? item.value : "••••"}
                  </span>
                  {showDollarAmounts ? (
                    <span
                      className={cn(
                        "text-[13px] font-semibold tabular-nums lg:text-[14px]",
                        item.tone === "positive" && "text-success",
                        item.tone === "warning" && "text-warning",
                      )}
                    >
                      {item.change}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function formatCompactUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 10_000 ? 1 : 2)}K`
  return formatUsd(value)
}

function formatPct(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/** Share of the fused bar that is offset (green); remainder is current deficit (red). */
function deficitOffsetPercent(offsetUsd: number, deficitUsd: number): number {
  const offset = Math.max(offsetUsd, 0)
  const deficit = Math.max(deficitUsd, 0)
  const total = offset + deficit
  if (total <= 0) return 50
  // Keep a visible red tip when offset dominates (USDC/GHO).
  return Math.min(96, Math.max(4, (offset / total) * 100))
}

function UmbrellaStress() {
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()
  const umbrella = useUmbrellaSessionContext()
  const umbrellaAssetSummaries = umbrella.marketOrder.map((id) => umbrella.markets[id])
  const totalStakedUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.totalStakedUsd, 0)
  const targetCoverageUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.targetCoverageUsd, 0)
  const activeDeficitsUsd = umbrellaAssetSummaries.reduce((sum, market) => sum + market.currentDeficitUsd, 0)
  const cooldownUsd = umbrella.marketOrder
    .filter((id) => umbrella.positions[id].cooldownStatus === "cooling")
    .reduce((sum, id) => sum + umbrella.markets[id].totalStakedUsd, 0)

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Market Level Risk
        </h2>
        <CarouselArrowButtons
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => scrollByCard(-1)}
          onNext={() => scrollByCard(1)}
          prevLabel="Previous market risk"
          nextLabel="Next market risk"
        />
      </div>

      <div className="space-y-3">
        <div className="rounded-radius-md bg-card px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[13px] text-muted-foreground">Total coverage</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {formatCompactUsd(totalStakedUsd)}
            </p>
          </div>

          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full">
            <div className="h-full min-w-0 flex-[1] bg-brand" />
            <div className="h-full min-w-0 flex-[0.7] bg-danger" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-brand">
                {formatPct((totalStakedUsd / targetCoverageUsd) * 100)}% covered
              </div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                {formatCompactUsd(totalStakedUsd)} staked · {formatCompactUsd(targetCoverageUsd)} target · 4 assets
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-danger">
                {formatCompactUsd(cooldownUsd)} in cooldown
              </div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                {formatPct((cooldownUsd / totalStakedUsd) * 100)}% cooling · {formatCompactUsd(activeDeficitsUsd)} active deficits
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-full gap-3">
            {umbrellaAssetSummaries.map((asset) => (
              <li
                key={asset.id}
                data-carousel-card
                className="w-[min(320px,88%)] shrink-0 snap-start md:w-[360px]"
              >
                <div className="h-full rounded-radius-md bg-card px-4 py-4">
                  <div className="flex items-center gap-3.5">
                    <TokenIcon symbol={asset.symbol} size="table" className="size-16" />
                    <div>
                      <div className="text-[18px] font-semibold tracking-[-0.04em]">{asset.symbol}</div>
                      <div className="mt-0.5 text-[14px] text-muted-foreground">{asset.coverage}</div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Coverage</span>
                      <span className="text-[15px] font-semibold tabular-nums">{formatCompactUsd(asset.totalStakedUsd)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Target</span>
                      <span className="text-[15px] font-semibold tabular-nums">{formatCompactUsd(asset.targetCoverageUsd)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">APY</span>
                      <span className="text-[15px] font-semibold tabular-nums">{formatPct(asset.apy)}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Action</span>
                      <span className="text-[15px] font-semibold tabular-nums">Stake / Unstake</span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex h-2.5 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${deficitOffsetPercent(asset.deficitOffsetUsd, asset.currentDeficitUsd)}%` }}
                      />
                      <div
                        className="h-full bg-danger"
                        style={{
                          width: `${100 - deficitOffsetPercent(asset.deficitOffsetUsd, asset.currentDeficitUsd)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-[16px] font-semibold tracking-[-0.04em] text-brand">
                          {formatCompactUsd(asset.deficitOffsetUsd)} offset
                        </div>
                        <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                          Buffer for {asset.symbol} deficits
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-[16px] font-semibold tracking-[-0.04em] text-danger">
                          {formatCompactUsd(asset.currentDeficitUsd)} current deficit
                        </div>
                        <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                          Active shortfall in {asset.symbol}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const UMBRELLA_ACTION_TABS = [
  { id: "stake", label: "Stake" },
  { id: "claim", label: "Claim" },
  { id: "cooldown", label: "Cooldown" },
  { id: "unstake", label: "Unstake" },
] as const

export type UmbrellaActionTab = (typeof UMBRELLA_ACTION_TABS)[number]["id"]

export type UmbrellaModuleId = UmbrellaMarketId

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseAmount(value: string) {
  const numeric = Number.parseFloat(value.replace(/,/g, ""))
  return Number.isFinite(numeric) ? numeric : 0
}

function formatUnits(value: number) {
  const fraction = Number.isInteger(value) ? 0 : 3
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })
}

function formatAge(elapsedMs: number) {
  const s = Math.max(1, Math.floor(elapsedMs / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function UmbrellaActionSidebar({
  tab,
  onTabChange,
  moduleId,
  onModuleChange,
}: {
  tab: UmbrellaActionTab
  onTabChange: (tab: UmbrellaActionTab) => void
  moduleId: UmbrellaModuleId
  onModuleChange: (id: UmbrellaModuleId) => void
}) {
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const umbrella = useUmbrellaSessionContext()
  const selected = umbrella.markets[moduleId] ?? umbrella.markets.gho
  const selectedPosition = umbrella.positions[selected.id]
  const selectedBalance = umbrella.walletBalances[selected.id] ?? 0
  const selectedStaked = selectedPosition.amount
  const entered = parseAmount(amount)
  const activeStake = Math.max(0, selectedStaked - selectedPosition.cooldownAmount)
  const maxAmount = tab === "stake" ? selectedBalance : tab === "cooldown" ? activeStake : selectedPosition.cooldownAmount
  const canSubmit = tab === "claim" ? selectedPosition.pendingRewardsUsd > 0 : entered > 0 && entered <= maxAmount
  const assetOptions = umbrella.marketOrder.map((id) => ({
    id,
    label: umbrella.markets[id].symbol,
    symbol: umbrella.markets[id].symbol,
    sublabel: `${formatPct(umbrella.markets[id].apy)}%`,
  }))

  const selectModule = (id: string) => {
    onModuleChange(id as UmbrellaModuleId)
    setAmount("")
    setError(null)
  }

  const submit = async () => {
    setError(null)
    try {
      if (tab === "stake") {
        await umbrella.stake(selected.id, entered)
      } else if (tab === "claim") {
        await umbrella.claim(selected.id)
      } else if (tab === "cooldown") {
        await umbrella.startCooldown(selected.id, entered)
      } else {
        await umbrella.unstake(selected.id, entered)
      }
      setAmount("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Umbrella action failed")
    }
  }

  return (
    <aside className="flex w-full flex-col" aria-label="Umbrella actions">
      <DetailActionTabs
        items={UMBRELLA_ACTION_TABS}
        value={tab}
        onChange={(next) => {
          onTabChange(next)
          setAmount("")
        }}
        ariaLabel="Umbrella actions"
      />

      <div className="mt-2">
        <DetailSidebarActionCard className="gap-4">
          {tab === "stake" ? (
            <>
              <ActionAmountCard
                label="Stake"
                amount={amount}
                onAmountChange={setAmount}
                approxUsdLabel={formatUsd(entered * selected.priceUsd)}
                assetLabel={selected.symbol}
                assetSymbol={selected.symbol}
                balanceLabel="Wallet balance"
                balanceValue={`${formatUnits(selectedBalance)} ${selected.symbol}`}
                onMax={() => setAmount(String(selectedBalance))}
                variant="raised"
                assetOptions={assetOptions}
                selectedAssetId={selected.id}
                onAssetSelect={selectModule}
              />
              <ActionCard>
                <ActionInfoRow label="Covers" value={selected.coverage} />
                <ActionInfoRow className="border-t border-border" label="Est. rewards" value={`${formatPct(selected.apy)}% APY`} />
              </ActionCard>
              {error ? <p className="text-[12px] leading-5 text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={!canSubmit}
                className={primaryCtaClass({ disabled: !canSubmit, className: "mt-1" })}
                onClick={submit}
              >
                Stake
              </button>
            </>
          ) : null}

          {tab === "claim" ? (
            <>
              <ActionCard>
                <ActionInfoRow label="Asset" value={selected.symbol} />
                <ActionInfoRow
                  className="border-t border-border"
                  label="Pending rewards"
                  value={formatUsd(selectedPosition.pendingRewardsUsd)}
                />
                <ActionInfoRow
                  className="border-t border-border"
                  label="Claimed rewards"
                  value={formatUsd(selectedPosition.claimedRewardsUsd)}
                />
              </ActionCard>
              {error ? <p className="text-[12px] leading-5 text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={!canSubmit}
                className={primaryCtaClass({ disabled: !canSubmit, className: "mt-1" })}
                onClick={submit}
              >
                Claim
              </button>
            </>
          ) : null}

          {tab === "cooldown" ? (
            <>
              <ActionAmountCard
                label="Start cooldown"
                amount={amount}
                onAmountChange={setAmount}
                approxUsdLabel={formatUsd(entered * selected.priceUsd)}
                assetLabel={selected.symbol}
                assetSymbol={selected.symbol}
                balanceLabel="Active stake"
                balanceValue={`${formatUnits(activeStake)} ${selected.symbol}`}
                onMax={() => setAmount(String(activeStake))}
                variant="raised"
                assetOptions={assetOptions}
                selectedAssetId={selected.id}
                onAssetSelect={selectModule}
              />
              <ActionCard>
                <ActionInfoRow label="Cooldown" value="20 days" />
                <ActionInfoRow className="border-t border-border" label="Withdrawal window" value="2 days" />
                <ActionInfoRow className="border-t border-border" label="Slashing risk" value={selected.coverage} />
              </ActionCard>
              {error ? <p className="text-[12px] leading-5 text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={!canSubmit}
                className={primaryCtaClass({ disabled: !canSubmit, className: "mt-1" })}
                onClick={submit}
              >
                Start cooldown
              </button>
            </>
          ) : null}

          {tab === "unstake" ? (
            <>
              <ActionAmountCard
                label="Unstake"
                amount={amount}
                onAmountChange={setAmount}
                approxUsdLabel={formatUsd(entered * selected.priceUsd)}
                assetLabel={selected.symbol}
                assetSymbol={selected.symbol}
                balanceLabel="Staked"
                balanceValue={`${formatUnits(selectedPosition.cooldownAmount)} ${selected.symbol}`}
                onMax={() => setAmount(String(selectedPosition.cooldownAmount))}
                variant="raised"
                assetOptions={assetOptions}
                selectedAssetId={selected.id}
                onAssetSelect={selectModule}
              />
              <ActionCard>
                <ActionInfoRow label="Cooldown" value={selectedPosition.cooldownStatus === "ready" ? "Ready" : "Not ready"} />
                <ActionInfoRow className="border-t border-border" label="Coverage" value={selected.coverage} />
              </ActionCard>
              {selectedPosition.cooldownStatus === "ready" ? (
                <p className="text-[12px] leading-5 text-muted-foreground">
                  Withdrawal window is open for this module.
                </p>
              ) : null}
              {error ? <p className="text-[12px] leading-5 text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={!canSubmit}
                className={primaryCtaClass({
                  disabled: !canSubmit,
                  className: "mt-1",
                })}
                onClick={submit}
              >
                Unstake
              </button>
            </>
          ) : null}
        </DetailSidebarActionCard>
      </div>
    </aside>
  )
}

function UmbrellaPositions({ onUnstake }: { onUnstake: (id: UmbrellaModuleId) => void }) {
  const umbrella = useUmbrellaSessionContext()
  const umbrellaPositions = umbrella.marketOrder.map((id) => {
    const market = umbrella.markets[id]
    const position = umbrella.positions[id]
    return {
      id,
      asset: market.asset,
      symbol: market.symbol,
      staked: formatUsd(position.valueUsd),
      apy: `${formatPct(market.apy)}%`,
      coverage: market.coverage,
      pendingRewards: formatUsd(position.pendingRewardsUsd),
      cooldown: formatUnits(position.cooldownAmount),
      status:
        position.cooldownStatus === "ready" ? "Withdrawal ready" : position.cooldownStatus === "cooling" ? "In cooldown" : "Earning",
    }
  })

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Umbrella positions
        </h2>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>Asset</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Your stake</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>APY</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Rewards</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Status</th>
                <SilentActionHeader className="!rounded-none pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {umbrellaPositions.map((position) => (
                <tr key={position.id} className="group transition-colors">
                  <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={position.symbol} size="table" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                          {position.asset}
                        </span>
                        <span className="mt-0.5 text-[13px] text-muted-foreground">{position.coverage}</span>
                      </div>
                    </div>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                      {position.staked}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                      {position.apy}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-right", TABLE_ROW_HOVER_BG)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-success">
                      {position.pendingRewards}
                    </span>
                  </td>
                  <td className={cn("py-3.5 px-4 text-center", TABLE_ROW_HOVER_BG)}>
                    <span className="inline-block max-w-full whitespace-normal text-[15px] font-normal leading-5 tracking-[-0.03em] text-foreground dark:text-white">
                      {position.status}
                    </span>
                  </td>
                  <td className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}>
                    <HoverActionGroup className="justify-end">
                      <Button
                        type="button"
                        size="table"
                        variant="table-primary"
                        className="w-auto"
                        onClick={() => onUnstake(position.id)}
                      >
                        <ActionIcon label="Unstake" />
                        Unstake
                      </Button>
                    </HoverActionGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>

      <div className="space-y-2 md:hidden">
        {umbrellaPositions.map((position) => (
          <div key={position.id} className="rounded-radius-md bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <TokenIcon symbol={position.symbol} size="table" />
              <div>
                <div className="font-semibold text-foreground">{position.asset}</div>
                <div className="text-[13px] text-muted-foreground">{position.coverage}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[13px] text-muted-foreground">Staked</div>
                <div className="font-medium">{position.staked}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">APY</div>
                <div className="font-medium">{position.apy}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Status</div>
                <div className="font-medium">{position.status}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Rewards</div>
                <div className="font-medium text-success">{position.pendingRewards}</div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </section>
  )
}

function UmbrellaCooldown({ onRemove }: { onRemove: (id: string) => void }) {
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()
  const umbrella = useUmbrellaSessionContext()
  const coolingPositions = umbrella.marketOrder
    .filter((id) => umbrella.positions[id].cooldownStatus !== "idle")
    .map((id) => ({
      id,
      asset: umbrella.markets[id].asset,
      symbol: umbrella.markets[id].symbol,
      coverage: umbrella.markets[id].coverage,
      cooldownStatus: umbrella.positions[id].cooldownStatus,
      cooldownRemaining: umbrella.positions[id].cooldownRemaining,
      removesIn: umbrella.positions[id].removesIn,
    }))
  if (coolingPositions.length === 0) return null

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Umbrella Cooldown
        </h2>
        <CarouselArrowButtons
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => scrollByCard(-1)}
          onNext={() => scrollByCard(1)}
          prevLabel="Previous cooldown"
          nextLabel="Next cooldown"
        />
      </div>

      <div className="overflow-hidden">
        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
        <ul className="flex w-full gap-3">
          {coolingPositions.map((position) => {
            const canRemove = position.cooldownStatus === "ready"

            return (
              <li
                key={position.id}
                data-carousel-card
                className="w-[min(280px,85%)] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
              >
                <div className="rounded-radius-md bg-card px-4 py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TokenIcon symbol={position.symbol} size="table" />
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold tracking-[-0.03em]">{position.asset}</div>
                      <div className="truncate text-[13px] text-muted-foreground">{position.coverage}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[13px] text-muted-foreground">Cooldown</div>
                      <div className="mt-1 text-[20px] font-semibold tracking-[-0.04em] tabular-nums">
                        {position.cooldownRemaining}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] text-muted-foreground">Removes in</div>
                      <div
                        className={cn(
                          "mt-1 text-[20px] font-semibold tracking-[-0.04em] tabular-nums",
                          canRemove && "text-success",
                        )}
                      >
                        {position.removesIn}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="brand"
                    className="mt-4 h-10 w-full gap-2"
                    disabled={!canRemove}
                    onClick={() => onRemove(position.id)}
                  >
                    <ActionIcon label="Unstake" />
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
        </div>
      </div>
    </section>
  )
}

function UmbrellaActivity() {
  const umbrella = useUmbrellaSessionContext()
  const now = Date.now()
  const rows: TxHistoryRow[] = umbrella.transactionHistory
    .filter((row) => row.kind !== "startCooldown")
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      at: new Date(row.timestamp).toISOString(),
      timeLabel: formatAge(now - row.timestamp),
      kind: row.kind === "claim" ? "rewards" : row.kind === "unstake" ? "withdraw" : "supply",
      amountLabel:
        row.kind === "claim"
          ? formatUsd(row.amountUsd)
          : `${row.kind === "unstake" ? "-" : "+"}${formatUnits(row.amount)} ${row.symbol}`,
      walletLabel: "Sandbox wallet",
      txHashShort: row.hash.slice(0, 10),
      source: "sandbox",
    }))
  if (rows.length === 0) return null

  return (
    <TransactionHistoryCard
      transactions={rows}
      assetSymbol="Umbrella"
      title="Umbrella activity"
      kindLabelMap={{ supply: "Stake", withdraw: "Unstake", rewards: "Claim" }}
      hideFilters
    />
  )
}

function UmbrellaLearnSection() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Learn Umbrella
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {learnCards.map((card) => (
          <article key={card.title} className="rounded-radius-md bg-card px-4 py-4">
            <card.icon className="h-6 w-6 text-brand" />
            <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.03em]">{card.title}</h3>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function UmbrellaPage() {
  const [actionTab, setActionTab] = useState<UmbrellaActionTab>("stake")
  const [moduleId, setModuleId] = useState<UmbrellaModuleId>("gho")

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
        <div className="mx-auto max-w-[1152px]">
          <div className={detailSectionStackClass}>
            <UmbrellaHero />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
              <div className="min-w-0">
                <UmbrellaPositions
                  onUnstake={(id) => {
                    setModuleId(id)
                    setActionTab("unstake")
                  }}
                />
              </div>

              <aside className="hidden space-y-8 lg:block lg:self-start">
                <UmbrellaActionSidebar
                  tab={actionTab}
                  onTabChange={setActionTab}
                  moduleId={moduleId}
                  onModuleChange={setModuleId}
                />
              </aside>
            </div>

            <UmbrellaCooldown
              onRemove={(id) => {
                setModuleId(id as UmbrellaModuleId)
                setActionTab("unstake")
              }}
            />
            <UmbrellaActivity />
            <UmbrellaStress />
            <UmbrellaLearnSection />
          </div>

          <MobileDetailActionBar className="grid grid-cols-2 gap-3">
            <Link
              href={actionPagePath("umbrella", "unstake", { market: moduleId, return: "/umbrella" })}
              className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
            >
              <ActionIcon label="Unstake" />
              Unstake
            </Link>
            <Link
              href={actionPagePath("umbrella", "stake", { market: moduleId, return: "/umbrella" })}
              className={primaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
            >
              <ActionIcon label="Stake" />
              Stake
            </Link>
          </MobileDetailActionBar>
        </div>
      </main>
    </div>
  )
}
