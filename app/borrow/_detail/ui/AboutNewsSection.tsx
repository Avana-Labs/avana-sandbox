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
  className?: string
}

export function AboutNewsSection({ about, newsImageUrl, newsImageLabel, className }: Props) {
  return (
    <section className={cn("space-y-4 pt-10", className)}>
      <AboutCard about={about} />
      <NewsCard items={buildNewsItems(about, newsImageUrl, newsImageLabel)} />
    </section>
  )
}
