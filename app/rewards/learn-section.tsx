"use client"

import type { LucideIcon } from "@/app/components/icons"
import {
  ArrowUpRight,
  ChevronRight,
  Compass,
  GraduationCap,
  Repeat,
  Sparkles,
  Umbrella,
  Unlock,
} from "@/app/components/icons"
import { useTranslation } from "@/app/lib/i18n/use-translation"

// The blog lives on the marketing deployment, not this webapp, so cards link out
// with absolute URLs. Update the slug list to re-curate which posts are featured.
const BLOG_BASE = "https://avana-ashen.vercel.app/blog"

type LearnCard = {
  title: string
  category: string
  slug: string
  icon: LucideIcon
}

const LEARN_CARDS: LearnCard[] = [
  { title: "A Beginner's Guide to LP Collateral", category: "Guide", slug: "lp-collateral-guide", icon: GraduationCap },
  { title: "What LP Collateral Makes Possible", category: "Guide", slug: "unleashing-lp-tokens", icon: Unlock },
  { title: "Thinking Clearly About Yield Looping", category: "Guide", slug: "yield-looping-playbook", icon: Repeat },
  { title: "How to Hedge an LP Position", category: "Guide", slug: "hedge-lp-position", icon: Umbrella },
  { title: "Making LP Collateral Usable", category: "Guide", slug: "defi-ux-challenges", icon: Sparkles },
  {
    title: "Avana and the Next Step for Liquidity Providers",
    category: "Strategy",
    slug: "avana-lp-collateral",
    icon: Compass,
  },
]

export function LearnSection() {
  const { t } = useTranslation()

  return (
    <section className="min-w-0 space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{t("Learn")}</h2>

      {/* Desktop / tablet: media rows on the Explore card surface (borderless bg-card) */}
      <div className="hidden gap-3 md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {LEARN_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <a
              key={card.slug}
              href={`${BLOG_BASE}/${card.slug}`}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3.5 rounded-radius-md border-0 bg-card p-4 shadow-none transition-colors hover:bg-hover"
            >
              <Icon className="h-6 w-6 flex-none text-brand" strokeWidth={1.75} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium leading-snug text-foreground">
                  {t(card.title)}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{t(card.category)}</span>
              </span>
              <ArrowUpRight
                className="ml-auto h-4 w-4 flex-none text-muted-foreground/70 transition-colors group-hover:text-foreground"
                aria-hidden="true"
              />
            </a>
          )
        })}
      </div>

      {/* Mobile: bordered list rows */}
      <div className="overflow-hidden rounded-radius-md border border-border md:hidden">
        {LEARN_CARDS.map((card, index) => {
          const Icon = card.icon
          return (
            <a
              key={card.slug}
              href={`${BLOG_BASE}/${card.slug}`}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-hover ${
                index < LEARN_CARDS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Icon className="h-[18px] w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1 truncate text-[14px] font-medium text-foreground">{t(card.title)}</span>
              <span className="text-[12px] text-muted-foreground">{t(card.category)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </section>
  )
}
