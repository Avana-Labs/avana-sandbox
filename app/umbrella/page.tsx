"use client"

import { useState } from "react"
import { Circle, CircleArrowUp, CircleDollarSign, Coins, ShieldCheck, Umbrella, Unlock } from "@/app/components/icons"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { ActionAmountCard } from "@/app/components/action-page/action-amount-card"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { ActionCard, ActionInfoRow } from "@/app/components/action-page/action-metrics"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import { DetailActionTabs } from "@/app/components/detail-action-tabs"
import { ActionIcon } from "@/app/components/action-icon"
import { detailSectionStackClass, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { AmountVisibilityToggle } from "@/app/components/amount-visibility-toggle"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"

const umbrellaPositions = [
  {
    id: "ausdc",
    asset: "aUSDC",
    symbol: "USDC",
    network: "Ethereum Core",
    staked: "$42,860",
    rewards: "$128.42",
    apy: "6.8%",
    coverage: "USDC deficits",
    status: "Earning",
    tone: "positive",
    cooldownStatus: "idle",
    cooldownLabel: "Not started",
    cooldownRemaining: "—",
    removesIn: "After 20 days",
  },
  {
    id: "aweth",
    asset: "aWETH",
    symbol: "WETH",
    network: "Ethereum Core",
    staked: "$18,240",
    rewards: "$41.09",
    apy: "4.2%",
    coverage: "WETH deficits",
    status: "Cooldown ready",
    tone: "warning",
    cooldownStatus: "cooling",
    cooldownLabel: "In cooldown",
    cooldownRemaining: "4d 11h",
    removesIn: "4d 11h",
  },
  {
    id: "gho",
    asset: "GHO",
    symbol: "GHO",
    network: "Ethereum",
    staked: "$9,500",
    rewards: "$36.77",
    apy: "8.1%",
    coverage: "GHO deficits",
    status: "Earning",
    tone: "positive",
    cooldownStatus: "ready",
    cooldownLabel: "Ready to remove",
    cooldownRemaining: "1d 8h",
    removesIn: "0d 0h",
  },
] as const

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
    title: "Claiming rewards",
    body: "Incentives accrue separately from the staked position, so claiming does not reset cooldown or unstake funds.",
    icon: CircleDollarSign,
  },
  {
    title: "Module assets",
    body: "Umbrella positions are split by asset and network, so each stake token has its own risk and reward profile.",
    icon: Umbrella,
  },
]

const umbrellaAssetSummaries = [
  {
    asset: "USDC",
    symbol: "USDC",
    coverage: "$60.3M",
    targetCoverage: "$38.4M",
    currentDeficit: "$51,371",
    deficitOffset: "$1.30M",
    totalApy: "4.91%",
    claimable: "274.08K",
    rewards: "452.18K",
  },
  {
    asset: "GHO",
    symbol: "GHO",
    coverage: "$13.2M",
    targetCoverage: "$1",
    currentDeficit: "$146",
    deficitOffset: "$3.00M",
    totalApy: "0.00%",
    claimable: "68.13K",
    rewards: "118.49K",
  },
  {
    asset: "WETH",
    symbol: "WETH",
    coverage: "$16.3M",
    targetCoverage: "$18.6K",
    currentDeficit: "$52,973",
    deficitOffset: "$53.0K",
    totalApy: "5.31%",
    claimable: "45.36",
    rewards: "159.81",
  },
]

const userUmbrellaSnapshot = [
  { label: "Staked", value: "$70,600", change: "▲ 2.8%", tone: "positive" },
  { label: "Claimable", value: "$206.28", change: "ready", tone: "positive" },
  { label: "In cooldown", value: "$18,240", change: "25.8%", tone: "warning" },
  { label: "Net rewards APY", value: "6.4%", change: "+0.3%", tone: "positive" },
]

function UmbrellaHero() {
  const { showDollarAmounts } = useAmountDisplayPreferences()

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

function parseCompactUsd(value: string): number {
  const normalized = value.trim().replace(/[$,]/g, "").toUpperCase()
  if (normalized.endsWith("M")) return Number.parseFloat(normalized) * 1_000_000
  if (normalized.endsWith("K")) return Number.parseFloat(normalized) * 1_000
  return Number.parseFloat(normalized) || 0
}

/** Share of the fused bar that is offset (green); remainder is current deficit (red). */
function deficitOffsetPercent(offset: string, deficit: string): number {
  const offsetUsd = Math.max(parseCompactUsd(offset), 0)
  const deficitUsd = Math.max(parseCompactUsd(deficit), 0)
  const total = offsetUsd + deficitUsd
  if (total <= 0) return 50
  // Keep a visible red tip when offset dominates (USDC/GHO).
  return Math.min(96, Math.max(4, (offsetUsd / total) * 100))
}

function UmbrellaStress() {
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Market Level Risk
        </h2>
        <div className="md:hidden">
          <CarouselArrowButtons
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => scrollByCard(-1)}
            onNext={() => scrollByCard(1)}
            prevLabel="Previous market risk"
            nextLabel="Next market risk"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-radius-md bg-card px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[13px] text-muted-foreground">Total coverage</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              $159M
            </p>
          </div>

          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full">
            <div className="h-full min-w-0 flex-[1] bg-brand" />
            <div className="h-full min-w-0 flex-[0.7] bg-danger" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-brand">139.77% covered</div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                $159M supplied · $114M target · 6.74K users
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-danger">$61M in cooldown</div>
              <div className="mt-2 text-[14px] font-medium text-muted-foreground">
                38% cooling · $104.8K active deficits
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory md:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-full gap-3 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-3">
            {umbrellaAssetSummaries.map((asset) => (
              <li
                key={asset.asset}
                data-carousel-card
                className="w-[min(320px,88%)] shrink-0 snap-start md:w-auto md:shrink md:snap-align-none"
              >
                <div className="h-full rounded-radius-md bg-card px-4 py-4">
                  <div className="flex items-center gap-3.5">
                    <TokenIcon symbol={asset.symbol} size="table" className="size-16" />
                    <div>
                      <div className="text-[18px] font-semibold tracking-[-0.04em]">{asset.asset}</div>
                      <div className="mt-0.5 text-[14px] text-muted-foreground">Covers {asset.asset} deficits</div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Coverage</span>
                      <span className="text-[15px] font-semibold tabular-nums">{asset.coverage}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Target</span>
                      <span className="text-[15px] font-semibold tabular-nums">{asset.targetCoverage}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">APY</span>
                      <span className="text-[15px] font-semibold tabular-nums">{asset.totalApy}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Claimable</span>
                      <span className="text-[15px] font-semibold tabular-nums">{asset.claimable}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-muted-foreground">Rewards</span>
                      <span className="text-[15px] font-semibold tabular-nums">{asset.rewards}</span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex h-2.5 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${deficitOffsetPercent(asset.deficitOffset, asset.currentDeficit)}%` }}
                      />
                      <div
                        className="h-full bg-danger"
                        style={{
                          width: `${100 - deficitOffsetPercent(asset.deficitOffset, asset.currentDeficit)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-[16px] font-semibold tracking-[-0.04em] text-brand">
                          {asset.deficitOffset} offset
                        </div>
                        <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                          Buffer for {asset.asset} deficits
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-[16px] font-semibold tracking-[-0.04em] text-danger">
                          {asset.currentDeficit} current deficit
                        </div>
                        <div className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                          Active shortfall in {asset.asset}
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
  { id: "unstake", label: "Unstake" },
] as const

type UmbrellaActionTab = (typeof UMBRELLA_ACTION_TABS)[number]["id"]

const umbrellaModules = [
  {
    id: "ausdc",
    label: "aUSDC",
    symbol: "USDC",
    balance: "12420",
    claimable: "128.42",
    staked: "42860",
    covers: "USDC deficits",
    apy: "6.8%",
    priceUsd: 1,
    cooldownReady: false,
  },
  {
    id: "aweth",
    label: "aWETH",
    symbol: "WETH",
    balance: "4.82",
    claimable: "41.09",
    staked: "8.14",
    covers: "WETH deficits",
    apy: "4.2%",
    priceUsd: 2240,
    cooldownReady: true,
  },
  {
    id: "gho",
    label: "GHO",
    symbol: "GHO",
    balance: "9500",
    claimable: "36.77",
    staked: "9500",
    covers: "GHO deficits",
    apy: "8.1%",
    priceUsd: 1,
    cooldownReady: false,
  },
  {
    id: "ausdt",
    label: "aUSDT",
    symbol: "USDT",
    balance: "6400",
    claimable: "18.4",
    staked: "6400",
    covers: "USDT deficits",
    apy: "5.4%",
    priceUsd: 1,
    cooldownReady: false,
  },
  {
    id: "wsteth",
    label: "wstETH",
    symbol: "wstETH",
    balance: "2.1",
    claimable: "12.8",
    staked: "3.62",
    covers: "wstETH deficits",
    apy: "3.9%",
    priceUsd: 3520,
    cooldownReady: false,
  },
] as const

type UmbrellaModuleId = (typeof umbrellaModules)[number]["id"]

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseAmount(value: string) {
  const numeric = Number.parseFloat(value.replace(/,/g, ""))
  return Number.isFinite(numeric) ? numeric : 0
}

function formatUnits(value: string) {
  const fraction = value.includes(".") ? value.split(".")[1]!.length : 0
  return parseAmount(value).toLocaleString("en-US", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  })
}

function UmbrellaActionSidebar({
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
  const selected = umbrellaModules.find((module) => module.id === moduleId) ?? umbrellaModules[0]
  const entered = parseAmount(amount)
  const canSubmit = entered > 0
  const assetOptions = umbrellaModules.map((module) => ({
    id: module.id,
    label: module.label,
    symbol: module.symbol,
    sublabel: module.apy,
  }))

  const selectModule = (id: string) => {
    onModuleChange(id as UmbrellaModuleId)
    setAmount("")
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
                assetLabel={selected.label}
                assetSymbol={selected.symbol}
                balanceLabel="Wallet balance"
                balanceValue={`${formatUnits(selected.balance)} ${selected.label}`}
                onMax={() => setAmount(selected.balance)}
                variant="raised"
                assetOptions={assetOptions}
                selectedAssetId={selected.id}
                onAssetSelect={selectModule}
              />
              <ActionCard>
                <ActionInfoRow label="Covers" value={selected.covers} />
                <ActionInfoRow className="border-t border-border" label="Est. rewards" value={`${selected.apy} APY`} />
              </ActionCard>
              <button
                type="button"
                disabled={!canSubmit}
                className={primaryCtaClass({ disabled: !canSubmit, className: "mt-1" })}
              >
                Stake
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
                assetLabel={selected.label}
                assetSymbol={selected.symbol}
                balanceLabel="Staked"
                balanceValue={`${formatUnits(selected.staked)} ${selected.label}`}
                onMax={() => setAmount(selected.staked)}
                variant="raised"
                assetOptions={assetOptions}
                selectedAssetId={selected.id}
                onAssetSelect={selectModule}
              />
              <ActionCard>
                <ActionInfoRow label="Cooldown" value={selected.cooldownReady ? "Ready" : "20 days"} />
                <ActionInfoRow className="border-t border-border" label="Coverage" value={selected.covers} />
              </ActionCard>
              {selected.cooldownReady ? (
                <p className="text-[12px] leading-5 text-muted-foreground">
                  Withdrawal window is open for this module.
                </p>
              ) : null}
              <button
                type="button"
                disabled={selected.cooldownReady ? !canSubmit : false}
                className={primaryCtaClass({
                  disabled: selected.cooldownReady && !canSubmit,
                  className: "mt-1",
                })}
              >
                {selected.cooldownReady ? "Remove" : "Unstake"}
              </button>
            </>
          ) : null}
        </DetailSidebarActionCard>
      </div>
    </aside>
  )
}

function UmbrellaPositions({ onClaim }: { onClaim: (id: UmbrellaModuleId) => void }) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Umbrella positions
        </h2>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>Asset</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Staked</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>APY</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Claimable</th>
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
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-success">{position.rewards}</span>
                  </td>
                  <td className={cn("py-3.5 pr-5", TABLE_ROW_HOVER_RIGHT)}>
                    <HoverActionGroup className="justify-end">
                      <Button
                        type="button"
                        size="table"
                        variant="table-primary"
                        className="w-auto"
                        onClick={() => onClaim(position.id)}
                      >
                        <ActionIcon label="Claim" />
                        Claim
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

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[13px] text-muted-foreground">Staked</div>
                <div className="font-medium">{position.staked}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">APY</div>
                <div className="font-medium">{position.apy}</div>
              </div>
              <div>
                <div className="text-[13px] text-muted-foreground">Claimable</div>
                <div className="font-medium text-success">{position.rewards}</div>
              </div>
            </div>

            <Button
              type="button"
              size="table"
              variant="table-primary"
              className="mt-3 w-full"
              onClick={() => onClaim(position.id)}
            >
              <ActionIcon label="Claim" />
              Claim
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}

const extraCooldowns = [
  {
    id: "ausdt",
    asset: "aUSDT",
    symbol: "USDT",
    coverage: "USDT deficits",
    cooldownStatus: "cooling",
    cooldownRemaining: "9d 2h",
    removesIn: "9d 2h",
  },
  {
    id: "wsteth",
    asset: "wstETH",
    symbol: "wstETH",
    coverage: "wstETH deficits",
    cooldownStatus: "cooling",
    cooldownRemaining: "16d 4h",
    removesIn: "16d 4h",
  },
] as const

function UmbrellaCooldown({ onRemove }: { onRemove: (id: string) => void }) {
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()
  const coolingPositions = [
    ...umbrellaPositions
      .filter((position) => position.cooldownStatus !== "idle")
      .map((position) => ({
        id: position.id,
        asset: position.asset,
        symbol: position.symbol,
        coverage: position.coverage,
        cooldownStatus: position.cooldownStatus,
        cooldownRemaining: position.cooldownRemaining,
        removesIn: position.removesIn,
      })),
    ...extraCooldowns,
  ]
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
    </section>
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
  const [moduleId, setModuleId] = useState<UmbrellaModuleId>("ausdc")

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
        <div className="mx-auto max-w-[1152px]">
          <div className={detailSectionStackClass}>
            <UmbrellaHero />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
              <div className="min-w-0">
                <UmbrellaPositions onClaim={setModuleId} />
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
            <UmbrellaStress />
            <UmbrellaLearnSection />
          </div>

          <MobileDetailActionBar className="grid grid-cols-2 gap-3">
            <button className={secondaryCtaClass({ size: "compact", className: "w-full gap-2.5" })} type="button">
              <CircleDollarSign className="h-5 w-5" />
              Claim
            </button>
            <button className={primaryCtaClass({ size: "compact", className: "w-full gap-2.5" })} type="button">
              <CircleArrowUp className="h-5 w-5" />
              Stake
            </button>
          </MobileDetailActionBar>
        </div>
      </main>
    </div>
  )
}
