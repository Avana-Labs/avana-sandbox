"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { TokenIcon } from "@/app/components/token-icon"
import { Button } from "@/components/ui/button"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { cn } from "@/lib/utils"

export function UmbrellaCooldown() {
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

                    {canRemove ? (
                      <Button asChild size="sm" variant="brand" className="mt-4 h-10 w-full gap-2">
                        <Link
                          href={actionPagePath("umbrella", "unstake", { market: position.id, return: "/umbrella" })}
                        >
                          <ActionIcon label="Remove" />
                          Remove
                        </Link>
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="brand" className="mt-4 h-10 w-full gap-2" disabled>
                        <ActionIcon label="Remove" />
                        Remove
                      </Button>
                    )}
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
