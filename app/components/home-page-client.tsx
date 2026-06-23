"use client"

import { useEffect, useState } from "react"
import { Settings } from "lucide-react"
import type { HomeMode } from "@/app/lib/home-sim"
import { BorrowActionPageClient } from "@/app/components/action-page/borrow-action-page-client"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

export function HomePageClient() {
  const { borrow: session } = useAvanaSessions()
  const [isClientReady, setIsClientReady] = useState(false)
  const [mode, setMode] = useState<HomeMode>("borrow")

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  if (!isClientReady || session.collateralPools.length === 0) {
    return (
      <div className="bg-background">
        <main className="px-4">
          <section className="flex items-start justify-center py-4 md:py-6">
            <div className="h-[360px] w-full max-w-[560px] animate-pulse rounded-radius-md border border-border bg-surface-raised" />
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex items-start justify-center py-4 md:py-6">
          <div className="w-full max-w-[560px]">
            <Tabs value={mode} onValueChange={(value) => setMode(value as HomeMode)} className="w-full">
              <div className="mb-4 flex items-center justify-between">
                <TabsList className="w-full justify-start">
                  {HOME_MODE_ITEMS.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className="text-[14px] font-normal">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  type="button"
                  className="ml-2 inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>

              <TabsContent value="borrow" className="mt-0">
                <BorrowActionPageClient kind="borrow" embedded closeHref="/" />
              </TabsContent>

              <TabsContent value="repay" className="mt-0">
                <BorrowActionPageClient kind="repay" embedded closeHref="/" />
              </TabsContent>

              <TabsContent value="claim" className="mt-0">
                <BorrowActionPageClient kind="claim" embedded closeHref="/" />
              </TabsContent>

              <TabsContent value="remove" className="mt-0">
                <BorrowActionPageClient kind="remove" embedded closeHref="/" initialAmount="25" />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  )
}
