"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"

function resolveGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function PortfolioHeroHeader() {
  const { t } = useTranslation()
  const [title, setTitle] = useState("Good morning")

  useEffect(() => {
    setTitle(resolveGreeting())
  }, [])

  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-[24px] font-medium tracking-[-0.04em] text-foreground sm:text-[30px]" suppressHydrationWarning>
        {t(title)}
      </h1>
    </div>
  )
}
