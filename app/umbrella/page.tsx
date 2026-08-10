"use client"

import {
  AlertTriangle,
  ArrowRight,
  Circle,
  CircleArrowUp,
  CircleDollarSign,
  Coins,
  ShieldCheck,
  Umbrella,
  Unlock,
} from "@/app/components/icons"
import { DetailSidebarActionCard } from "@/app/components/action-page/detail-sidebar-action-card"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import {
  TABLE_HEADER_CELL,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover"
import { cn } from "@/lib/utils"

const umbrellaPositions = [
  {
    asset: "aUSDC",
    symbol: "USDC",
    network: "Ethereum Core",
    staked: "$42,860",
    rewards: "$128.42",
    apy: "6.8%",
    coverage: "USDC deficits",
    status: "Earning",
    tone: "positive",
  },
  {
    asset: "aWETH",
    symbol: "WETH",
    network: "Ethereum Core",
    staked: "$18,240",
    rewards: "$41.09",
    apy: "4.2%",
    coverage: "WETH deficits",
    status: "Cooldown ready",
    tone: "warning",
  },
  {
    asset: "GHO",
    symbol: "GHO",
    network: "Ethereum",
    staked: "$9,500",
    rewards: "$36.77",
    apy: "8.1%",
    coverage: "GHO deficits",
    status: "Earning",
    tone: "positive",
  },
]

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
    totalApy: "4.91%",
    umbrellaApy: "1.62%",
    tokenApy: "3.29%",
    emissions: "426.84K",
    currentDeficit: "$51,371",
    deficitOffset: "$1.30M",
    emissionToken: "stkwaEthUSDC.v1",
    claimable: "274.08K",
    claimed: "2.13M",
    unallocated: "452.18K",
    runwayEnd: "26 Jan 2027",
    cooldownRelease: "$4.63M",
    cooldownWhen: "In 2 days",
  },
  {
    asset: "GHO",
    symbol: "GHO",
    coverage: "$13.2M",
    targetCoverage: "$1",
    totalApy: "0.00%",
    umbrellaApy: "0.00%",
    tokenApy: "0.00%",
    emissions: "0",
    currentDeficit: "$146",
    deficitOffset: "$3.00M",
    emissionToken: "stkGHO.v1",
    claimable: "68.13K",
    claimed: "1.09M",
    unallocated: "118.49K",
    runwayEnd: "—",
    cooldownRelease: "$3.28M",
    cooldownWhen: "Tomorrow",
  },
  {
    asset: "WETH",
    symbol: "WETH",
    coverage: "$16.3M",
    targetCoverage: "$18.6K",
    totalApy: "5.31%",
    umbrellaApy: "3.88%",
    tokenApy: "1.42%",
    emissions: "164.45",
    currentDeficit: "$52,973",
    deficitOffset: "$53.0K",
    emissionToken: "stkwaEthWETH.v1",
    claimable: "45.36",
    claimed: "451.22",
    unallocated: "159.81",
    runwayEnd: "5 Feb 2027",
    cooldownRelease: "$79K",
    cooldownWhen: "In 3 days",
  },
]

const userUmbrellaSnapshot = [
  { label: "Staked", value: "$70,600", tone: "default" },
  { label: "Claimable", value: "$206.28", tone: "positive" },
  { label: "In cooldown", value: "$18,240", tone: "warning" },
  { label: "Net rewards APY", value: "6.4%", tone: "positive" },
]

function UmbrellaHero() {
  return (
    <div className="mb-6 md:mb-8">
      <section className="relative overflow-hidden rounded-radius-md bg-card px-4 py-5 sm:px-5">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />
        <div className="relative">
          <div className="grid gap-4 md:grid-cols-4 md:divide-x md:divide-border">
            {userUmbrellaSnapshot.map((item) => (
              <div key={item.label} className="min-w-0 md:px-5 first:md:pl-0 last:md:pr-0">
                <div className="text-[13px] font-medium text-muted-foreground">{item.label}</div>
                <div
                  className={cn(
                    "mt-2 font-data text-[28px] font-medium leading-none tracking-tight tabular-nums text-foreground",
                    item.tone === "positive" && "text-success",
                    item.tone === "warning" && "text-warning",
                  )}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function UmbrellaStress() {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] font-semibold tracking-[-0.045em]">Market Level Risk</h2>
      </div>

      <div className="space-y-3">
        <div className="rounded-radius-md bg-card px-4 py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total coverage</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              $159M
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_0.7fr] gap-1">
            <div className="h-2.5 rounded-l-full bg-success" />
            <div className="h-2.5 rounded-r-full bg-danger" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[18px] font-semibold tracking-[-0.04em] text-success">139.77% covered</div>
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {umbrellaAssetSummaries.map((asset) => (
            <div key={asset.asset} className="rounded-radius-md bg-card px-4 py-4">
              <div className="flex items-center gap-3">
                <TokenIcon symbol={asset.symbol} size="table" />
                <div>
                  <div className="text-[15px] font-semibold tracking-[-0.03em]">{asset.asset}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">Covers {asset.asset} deficits</div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-muted-foreground">Coverage</span>
                  <span className="text-[14px] font-semibold tabular-nums">{asset.coverage}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-muted-foreground">Target</span>
                  <span className="text-[14px] font-semibold tabular-nums">{asset.targetCoverage}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-muted-foreground">Current deficit</span>
                  <span className="text-[14px] font-semibold tabular-nums">{asset.currentDeficit}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-muted-foreground">Deficit offset</span>
                  <span className="text-[14px] font-semibold tabular-nums">{asset.deficitOffset}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div>
                  <div className="text-[12px] text-muted-foreground">Total APY</div>
                  <div className="mt-1 text-[17px] font-semibold tracking-[-0.04em] tabular-nums">{asset.totalApy}</div>
                </div>
                <div>
                  <div className="text-[12px] text-muted-foreground">Umbrella APY</div>
                  <div className="mt-1 text-[17px] font-semibold tracking-[-0.04em] tabular-nums">
                    {asset.umbrellaApy}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">{asset.emissionToken}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">Emission runway</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular-nums">{asset.unallocated}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">{asset.runwayEnd}</div>
                  </div>
                </div>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  Claimable {asset.claimable} · Claimed {asset.claimed}
                </div>
              </div>

              <div className="mt-3 rounded-radius-sm bg-background px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-muted-foreground">{asset.cooldownWhen}</span>
                  <span className="text-[15px] font-semibold tracking-[-0.04em] tabular-nums">
                    {asset.cooldownRelease}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">Cooldown release</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function UmbrellaActionSidebar() {
  const actions = [
    { id: "stake", label: "Stake", action: "stake" },
    { id: "claim", label: "Claim", action: "claim" },
    { id: "cooldown", label: "Cooldown", action: "cooldown" },
    { id: "unstake", label: "Unstake", action: "unstake" },
  ]

  return (
    <aside className="flex w-full flex-col" aria-label="Umbrella actions">
      <div className="flex items-center justify-start">
        <ActionWorkspaceTabs
          items={actions}
          value="stake"
          onChange={() => {}}
          ariaLabel="Umbrella actions"
          withIcons
          revealLabels
        />
      </div>
      <div className="mt-3">
        <DetailSidebarActionCard>
          <div className="rounded-radius-md bg-card px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] text-muted-foreground">Selected module</div>
                <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-foreground">aUSDC Core</div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-primary-foreground">
                <Umbrella className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-radius-md bg-background px-3 py-3">
                <div className="text-[12px] text-muted-foreground">Wallet balance</div>
                <div className="mt-1 text-[20px] font-medium tracking-[-0.03em]">12,420 aUSDC</div>
              </div>
              <div className="rounded-radius-md bg-background px-3 py-3">
                <div className="text-[12px] text-muted-foreground">Covers</div>
                <div className="mt-1 text-[20px] font-medium tracking-[-0.03em]">USDC deficits</div>
              </div>
              <div className="rounded-radius-md bg-background px-3 py-3">
                <div className="text-[12px] text-muted-foreground">Estimated rewards</div>
                <div className="mt-1 text-[20px] font-medium tracking-[-0.03em] text-success">6.8% APY</div>
              </div>
            </div>

            <div className="mt-5 rounded-radius-md bg-warning/10 px-3 py-3 text-[13px] leading-5 text-foreground">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  UI preview only. Umbrella stake tokens remain slashable if the covered Aave asset has a deficit.
                </span>
              </div>
            </div>

            <button className={primaryCtaClass({ className: "mt-5 w-full gap-2.5" })} type="button">
              Stake into Umbrella
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </DetailSidebarActionCard>
      </div>
    </aside>
  )
}

function UmbrellaPositions() {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-semibold tracking-[-0.045em]">Umbrella positions</h2>
        </div>
      </div>

      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[13px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className={cn(TABLE_HEADER_CELL, "pl-5")}>Asset</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>Staked</th>
                <th className={cn(TABLE_HEADER_CELL, "px-4 text-right")}>APY</th>
                <th className={cn(TABLE_HEADER_CELL, "pr-5 text-right")}>Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {umbrellaPositions.map((position) => (
                <tr key={position.asset} className="group transition-colors">
                  <td className={cn("py-3.5 pl-5", TABLE_ROW_HOVER_LEFT)}>
                    <div className="flex items-center gap-2.5">
                      <TokenIcon symbol={position.symbol} size="table" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                          {position.asset}
                        </span>
                        <span className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
                          {position.network}
                        </span>
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
                  <td className={cn("py-3.5 pr-5 text-right", TABLE_ROW_HOVER_RIGHT)}>
                    <span className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                      {position.coverage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>

      <div className="space-y-2 md:hidden">
        {umbrellaPositions.map((position) => (
          <div key={position.asset} className="rounded-radius-md bg-card px-3 py-3">
            <div className="flex items-center gap-3">
              <TokenIcon symbol={position.symbol} size="table" />
              <div>
                <div className="font-semibold text-foreground">{position.asset}</div>
                <div className="text-[12px] text-muted-foreground">{position.network}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[12px] text-muted-foreground">Staked</div>
                <div className="font-medium">{position.staked}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">APY</div>
                <div className="font-medium">{position.apy}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">Coverage</div>
                <div className="font-medium">{position.coverage}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function UmbrellaClaimsCooldown() {
  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.04em]">Umbrella claims & cooldown</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {umbrellaPositions.map((position) => (
          <div key={position.asset} className="rounded-radius-md bg-card px-4 py-4">
            <div className="space-y-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <TokenIcon symbol={position.symbol} size="table" />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold tracking-[-0.03em]">{position.asset}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{position.network}</div>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2.5 py-1 text-[12px] font-semibold",
                  position.tone === "positive" ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                )}
              >
                {position.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <div>
                <div className="text-[12px] text-muted-foreground">Claimable</div>
                <div className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-success">{position.rewards}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">Cooldown</div>
                <div className="mt-1 text-[20px] font-semibold tracking-[-0.04em]">
                  {position.tone === "warning" ? "Active" : "Ready"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function UmbrellaLearnSection() {
  return (
    <section className="my-8 md:my-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[24px] font-semibold tracking-[-0.045em]">Learn Umbrella</h2>
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
  return (
    <main className="mx-auto w-full max-w-[1152px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
      <UmbrellaHero />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-8">
        <div className="min-w-0">
          <UmbrellaPositions />
          <UmbrellaClaimsCooldown />
        </div>

        <aside className="hidden space-y-8 lg:block lg:self-start">
          <UmbrellaActionSidebar />
        </aside>
      </div>

      <UmbrellaStress />
      <UmbrellaLearnSection />

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
    </main>
  )
}
