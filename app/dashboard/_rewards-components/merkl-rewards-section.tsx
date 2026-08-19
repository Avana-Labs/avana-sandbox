"use client"

import { useId } from "react"
import { LockKeyhole } from "@/app/components/icons"
import { CarouselArrowButtons, useOverflowCarousel } from "@/app/components/carousel-arrow-buttons"
import { Card } from "@/components/ui/card"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { AvaCoin } from "./quests-tab"

// Deterministic AVA amounts (500 – 10,000) so SSR and client agree. Order is
// deliberately shuffled so adjacent cards don't feel like a ladder.
const MERKL_AVA_AMOUNTS: readonly number[] = [2500, 500, 7500, 1250, 10000, 850, 4200, 6800, 1750, 9200, 3200, 5500]

function formatAvaAmount(amount: number) {
  return amount.toLocaleString("en-US")
}

/**
 * Scratch-card texture — silver/gray gradient with a diagonal repeating
 * "AVANA" watermark so it reads as "scratch to reveal" without shouting.
 * Kept low-contrast on purpose: less visible, more premium.
 */
function ScratchArt() {
  const patternId = useId()
  return (
    <div
      className="relative h-24 w-24 overflow-hidden rounded-radius-md bg-muted ring-1 ring-inset ring-border/60"
      aria-hidden
    >
      {/* Everything inside the frame gets a soft frost so the scratch texture
         reads as "hidden" — the outer ring stays crisp. */}
      <div className="absolute inset-0 blur-[2px]">
        {/* Base silver-ish gradient — pure grayscale via theme foreground tints. */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/15" />

        {/* Diagonal "AVANA" watermark — the scratch pattern. */}
        <svg
          className="absolute inset-0 h-full w-full text-foreground/25"
          viewBox="0 0 96 96"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern
              id={patternId}
              x="0"
              y="0"
              width="56"
              height="20"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-28)"
            >
              <text
                x="0"
                y="14"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                fontWeight="800"
                letterSpacing="1.5"
                fill="currentColor"
              >
                AVANA
              </text>
            </pattern>
          </defs>
          <rect width="96" height="96" fill={`url(#${patternId})`} />
        </svg>

        {/* A whisper of scratch stripes for surface texture. */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: "repeating-linear-gradient(35deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 4px)",
          }}
        />
      </div>
    </div>
  )
}

function MerklMysteryCard({ amount }: { amount: number }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center pb-1">
        <ScratchArt />
      </div>

      <Card className="flex flex-1 flex-col items-center justify-center rounded-radius-md border border-border/60 bg-card p-4 text-center shadow-none">
        <div className="flex items-center justify-center gap-1.5">
          <AvaCoin size={22} />
          <span className="font-data text-[22px] font-bold leading-none tracking-tight text-foreground">
            {formatAvaAmount(amount)}
          </span>
        </div>

        <div className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-radius-sm bg-muted/60 px-3 text-[13px] font-bold text-muted-foreground [&_svg]:size-4">
          <LockKeyhole />
          {t("Locked")}
        </div>
      </Card>
    </div>
  )
}

export function MerklRewardsSection() {
  const { t } = useTranslation()
  const { scrollerRef, canPrev, canNext, scrollByCard } = useOverflowCarousel()
  const count = MERKL_AVA_AMOUNTS.length

  return (
    <section aria-label={t("Merkl Rewards")} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">
            {t("Merkl Rewards")}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t("{count} rewards").replace("{count}", String(count))} · {t("Open on Launch Date")}
          </p>
        </div>
        {canPrev || canNext ? (
          <CarouselArrowButtons
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => scrollByCard(-1)}
            onNext={() => scrollByCard(1)}
            prevLabel={t("Previous rewards")}
            nextLabel={t("Next rewards")}
          />
        ) : null}
      </div>
      <div className="overflow-hidden">
        <div
          ref={scrollerRef}
          className="overflow-x-auto pb-1 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex w-full gap-3">
            {MERKL_AVA_AMOUNTS.map((amount, index) => (
              <li
                key={`merkl-${index}`}
                data-carousel-card
                className="w-[min(220px,72%)] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] xl:w-[calc((100%-1.5rem)/3)]"
              >
                <MerklMysteryCard amount={amount} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
