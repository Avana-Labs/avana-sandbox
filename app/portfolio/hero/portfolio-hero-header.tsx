"use client"

import { useEffect, useState } from "react"

function resolveGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function PortfolioHeroHeader() {
  const [title, setTitle] = useState("Welcome back")

  useEffect(() => {
    setTitle(resolveGreeting())
  }, [])

  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-[24px] font-medium tracking-[-0.04em] text-foreground sm:text-[30px]">{title}</h1>
    </div>
  )
}
