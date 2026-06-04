"use client"

import { cn } from "@/lib/utils"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { AboutCard } from "@/app/borrow/_detail/pool-sections"
import { NewsCard } from "./NewsCard"
import { buildNewsItems } from "@/app/borrow/_detail/lib/news"

type Props = {
  about: AboutCardData
  newsImageUrl?: string
  newsImageLabel?: string
  aboutTitle?: string
  compactAboutTitle?: boolean
  mediaVariant?: "card" | "icon"
  className?: string
}

export function AboutNewsSection({
  about,
  newsImageUrl,
  newsImageLabel,
  aboutTitle = "About",
  compactAboutTitle = false,
  mediaVariant = "card",
  className,
}: Props) {
  return (
    <section className={cn("space-y-8 pt-10", className)}>
      <AboutCard about={about} title={aboutTitle} compact={compactAboutTitle} plain />
      <NewsCard items={buildNewsItems(about, newsImageUrl, newsImageLabel)} plain mediaVariant={mediaVariant} />
    </section>
  )
}
