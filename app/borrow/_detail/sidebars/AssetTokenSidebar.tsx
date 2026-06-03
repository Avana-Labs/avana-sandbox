"use client"

import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutCard } from "@/app/borrow/_detail/pool-sections"
import { HeroSideCard, NewsCard } from "@/app/borrow/_detail/ui"
import { AssetDepositSidebar } from "./AssetDepositSidebar"

type Props = { detail: AssetDetail; className?: string }

type SidebarTab = "swap" | "perps" | "pools"

const AGGREGATORS = [
  { id: "titan", name: "Titan", href: "https://titan.exchange", accent: "bg-violet-500" },
  { id: "jupiter", name: "Jupiter", href: "https://jup.ag", accent: "bg-emerald-500" },
  { id: "kamino", name: "Kamino", href: "https://kamino.finance", accent: "bg-sky-500" },
  { id: "dflow", name: "DFlow", href: "https://dflow.net", accent: "bg-orange-500" },
] as const

/**
 * Token-style right rail: Swap / Perps / Pools tabs with aggregator links,
 * deposit flow on Pools, and an About block below — mirrors the Tokens detail UI.
 */
export function AssetTokenSidebar({ detail, className }: Props) {
  const [tab, setTab] = React.useState<SidebarTab>("swap")

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <HeroSideCard
        tabs={[
          { id: "swap", label: "Swap" },
          { id: "perps", label: "Perps" },
          { id: "pools", label: "Pools" },
        ]}
        value={tab}
        onValueChange={(value: string) => setTab(value as SidebarTab)}
        className="rounded-[20px] border border-[#E8E8E8] bg-white p-5 shadow-none [&>div]:p-0"
      >
        {tab === "pools" ? (
          <PoolsPanel detail={detail} />
        ) : (
          <AggregatorsPanel tab={tab} symbol={detail.hero.symbol} />
        )}
      </HeroSideCard>

      <AboutCard about={detail.about} title={`About ${detail.hero.name}`} compact />

      <NewsCard
        items={(detail.about.news ?? detail.about.history.slice(0, 3).map((entry, index) => ({
          title: entry.title,
          description: entry.description,
          source: index === 0 ? "Latest update" : "Protocol note",
          time: entry.date,
        }))).map((item) => ({
          ...item,
          imageUrl: detail.hero.visual.iconUrl ?? undefined,
          imageLabel: detail.hero.symbol,
        }))}
      />
    </div>
  )
}

function AggregatorsPanel({ tab, symbol }: { tab: Exclude<SidebarTab, "pools">; symbol: string }) {
  const heading = tab === "swap" ? "Aggregators" : "Venues"

  return (
    <div className="space-y-3 pt-1">
      <div className="text-[12px] font-medium text-[#9A9A9A]">{heading}</div>
      <ol className="space-y-0">
        {AGGREGATORS.map((venue, index) => (
          <li key={venue.id}>
            <a
              href={`${venue.href}?inputMint=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-[#F7F7F7]"
            >
              <span className="w-5 shrink-0 text-[13px] font-medium tabular-nums text-[#B0B0B0]">{index + 1}</span>
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                  venue.accent,
                )}
                aria-hidden
              >
                {venue.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-[#1A1A1A]">{venue.name}</span>
              <ArrowUpRight
                className="size-4 shrink-0 text-[#B8B8B8] transition-colors group-hover:text-foreground"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ol>
      {tab === "perps" ? (
        <p className="text-[12px] leading-relaxed text-[#8A8A8A]">
          Perpetual routes are surfaced for discovery only. Execution opens on the selected venue.
        </p>
      ) : null}
    </div>
  )
}

function PoolsPanel({ detail }: { detail: AssetDetail }) {
  return (
    <div className="-mx-1 -mb-1">
      <AssetDepositSidebar detail={detail} className="border-0 bg-transparent p-0 shadow-none" embedded />
    </div>
  )
}
