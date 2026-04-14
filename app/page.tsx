import { PageIntro } from "./components/page-intro"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy } from "lucide-react"
import { HomeHowItWorksDialog } from "@/app/components/home-how-it-works-dialog"
import { HomeTabs } from "@/app/components/home-tabs"
import { StaticSparkline } from "@/app/components/static-sparkline"
import { getCachedHomeSnapshot } from "@/app/lib/home-data"

export default async function HomePage() {
  const { chains, howItWorksSteps, metricCards, totalPools, completedPools, progressPercentage, totalPoints } =
    await getCachedHomeSnapshot()

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <PageIntro
            title="Borrow against LP positions"
            description="Keep liquidity on your favorite DEX, then borrow against it with Avana."
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <span className="font-data">{totalPoints.toLocaleString()}</span> points
            </Button>
            <HomeHowItWorksDialog steps={howItWorksSteps} />
          </PageIntro>

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
                  <div className="h-[60px] mt-4">
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
            <div className="flex items-center justify-between mb-2">
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
