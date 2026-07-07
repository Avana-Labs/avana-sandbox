"use client"

import { cn } from "@/lib/utils"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { AboutCard } from "@/app/borrow/_detail/pool-sections"
import { NewsCard } from "./NewsCard"
import { buildNewsItems } from "@/app/borrow/_detail/lib/news"

/** Parameter changes are decided in governance, so the feed links out there. */
const GOVERNANCE_URL = "https://governance.aave.com"

type Props = {
  about: AboutCardData
  newsImageUrl?: string
  newsImageLabel?: string
  aboutTitle?: string
  compactAboutTitle?: boolean
  newsTitle?: string
  /** Where "View all" and item links point (defaults to the governance forum). */
  governanceUrl?: string
  /** Legacy prop; media placement is now fixed to the news-style thumbnail. */
  mediaVariant?: "card" | "icon"
  className?: string
}

export function AboutNewsSection({
  about,
  newsImageUrl,
  newsImageLabel,
  aboutTitle = "About",
  compactAboutTitle = false,
  newsTitle = "Parameter Changes",
  governanceUrl = GOVERNANCE_URL,
  className,
}: Props) {
  const newsItems = buildNewsItems(about, newsImageUrl, newsImageLabel)

  return (
    <div className={cn("space-y-12 pt-10", className)}>
      <AboutCard about={about} title={aboutTitle} compact={compactAboutTitle} plain />
      {newsItems.length > 0 ? (
        <NewsCard items={newsItems} title={newsTitle} viewAllHref={governanceUrl} itemHrefFallback={governanceUrl} plain />
      ) : null}
    </div>
  )
}
