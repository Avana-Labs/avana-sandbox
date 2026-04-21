import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HomeTabs } from "@/app/components/home-tabs"
import { StaticSparkline } from "@/app/components/static-sparkline"
import { getCachedHomeSnapshot } from "@/app/lib/home-data"

export const metadata: Metadata = {
  title: "Rewards",
  description: "Track quest progress, points, and protocol metrics across Avana rewards.",
}

export default async function RewardsPage() {
  const { chains, metricCards, totalPools, completedPools, progressPercentage } = await getCachedHomeSnapshot()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[60.8rem]">
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <h2 className="sr-only">Protocol metrics overview</h2>
            {metricCards.map((metric) => (
              <Card key={metric.label} className="overflow-hidden border-border/70 bg-card">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p
                        className={`font-data text-3xl font-bold ${
                          metric.label === "Borrowing Power" || metric.label === "Fees Preserved" ? "text-emerald-600" : ""
                        }`}
                      >
                        {metric.value}
                      </p>
                      {metric.secondary && metric.secondary !== "Live" && (
                        <p className="text-sm text-muted-foreground">{metric.secondary}</p>
                      )}
                      {metric.secondary === "Live" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 font-compact text-xs font-medium text-emerald-700">
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 h-[60px]">
                    <StaticSparkline
                      seed={metric.sparklineSeed}
                      isPositive={metric.positive}
                      points={24}
                      height={60}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-8">
            <h2 className="sr-only">Quest progress overview</h2>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Your Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedPools}/{totalPools} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" aria-label="Overall quest completion progress" />
          </div>

          <HomeTabs chains={chains} />
        </div>
      </main>
    </div>
  )
}
