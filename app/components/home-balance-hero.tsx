"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, ShieldAlert, Sparkles } from "lucide-react"
import { HomeHowItWorksDialog } from "@/app/components/home-how-it-works-dialog"
import { StaticSparkline } from "@/app/components/static-sparkline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { HomeHowItWorksStep } from "@/app/lib/home-data"
import { HOME_PORTFOLIO_SUMMARY, formatCompactUsd, formatUsd } from "@/app/lib/home-sim"

type HomeBalanceHeroProps = {
  steps: HomeHowItWorksStep[]
  totalPoints: number
  totalPools: number
  completedPools: number
  progressPercentage: number
}

type HeroMetricProps = {
  label: string
  value: string
  tone?: "default" | "positive" | "primary"
}

function HeroMetric({ label, value, tone = "default" }: HeroMetricProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-background/70 p-4">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span
        className={[
          "font-data text-xl font-semibold tracking-tight",
          tone === "positive" ? "text-emerald-600" : "",
          tone === "primary" ? "text-primary" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

export function HomeBalanceHero({ steps, totalPoints, totalPools, completedPools, progressPercentage }: HomeBalanceHeroProps) {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <Card className="overflow-hidden rounded-[32px] border-border/70 bg-card/80 shadow-[0_20px_56px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <CardHeader className="gap-4 border-b border-border/60 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Badge variant="secondary" className="w-fit rounded-full bg-primary/10 px-3 py-1 text-primary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Premium LP workspace
          </Badge>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h1 className="font-medium text-foreground">My LP Collateral Balance</h1>
              <button
                type="button"
                onClick={() => setShowBalance((currentValue) => !currentValue)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <CardTitle className="font-data text-4xl font-semibold tracking-tight sm:text-5xl">
              {showBalance ? formatUsd(HOME_PORTFOLIO_SUMMARY.totalCollateralUsd) : "••••••••"}
            </CardTitle>
            <CardDescription className="text-sm text-emerald-600">
              +{formatUsd(HOME_PORTFOLIO_SUMMARY.dailyChangeUsd)} today
            </CardDescription>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HomeHowItWorksDialog steps={steps} />
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/risk-warning">
              <ShieldAlert data-icon="inline-start" />
              Risk warning
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-[28px] border border-border/60 bg-background/70 p-4">
            <StaticSparkline seed={HOME_PORTFOLIO_SUMMARY.chartSeed} isPositive className="h-[88px]" height={88} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <HeroMetric label="Borrowed" value={formatCompactUsd(HOME_PORTFOLIO_SUMMARY.borrowedUsd)} tone="primary" />
            <HeroMetric label="Available" value={formatCompactUsd(HOME_PORTFOLIO_SUMMARY.availableUsd)} tone="positive" />
            <HeroMetric label="Avg HF" value={HOME_PORTFOLIO_SUMMARY.averageHealthFactor.toFixed(1)} />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-background/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Quest progress</span>
              <span className="text-sm text-muted-foreground">
                {completedPools}/{totalPools} pools completed
              </span>
            </div>
            <Badge variant="secondary" className="rounded-full px-2.5 py-1">
              {progressPercentage.toFixed(0)}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" aria-label="Overall progress" />
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetric label="Reward points" value={totalPoints.toLocaleString("en-US")} tone="positive" />
            <HeroMetric label="Covered venues" value={totalPools.toString()} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
