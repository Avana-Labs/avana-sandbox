"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import type { ComponentType, SVGProps } from "react"

type DashboardHeroActionCardProps = {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  href?: string
  onClick?: () => void
  className?: string
}

type DashboardHeroActionPillProps = DashboardHeroActionCardProps & {
  active?: boolean
  armed?: boolean
  onActivate?: () => void
}

export function DashboardHeroActionCard({ label, icon: Icon, href, onClick, className }: DashboardHeroActionCardProps) {
  const classNameValue = `flex min-h-[94px] flex-col items-start justify-between rounded-radius-lg border-0 bg-[#dff2fb] px-[22px] py-[14px] text-brand shadow-none transition-colors hover:bg-[#d6eef9] dark:bg-[#0f1b24] dark:text-[#7DDCFF] dark:hover:bg-[#142331] ${className ?? ""}`

  if (href) {
    return (
      <Link href={href} className={classNameValue}>
        <Icon className="h-6 w-6 text-current" />
        <span className="text-[14px] font-semibold tracking-[-0.02em] text-current">{label}</span>
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classNameValue}>
      <Icon className="h-6 w-6 fill-current text-current" />
      <span className="text-[14px] font-semibold tracking-[-0.02em] text-current">{label}</span>
    </button>
  )
}

export function DashboardHeroActionPill({
  label,
  icon: Icon,
  href,
  onClick,
  className,
  active = false,
  armed = false,
  onActivate,
}: DashboardHeroActionPillProps) {
  const router = useRouter()
  const classNameValue = `dashboard-quick-action-pill inline-flex h-10 w-10 items-center justify-center gap-0 overflow-hidden rounded-full bg-field-bottom px-0 text-[14px] font-bold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.98] dark:bg-field-bottom dark:text-white ${className ?? ""}`

  const handlePress = () => {
    if (active && armed) {
      if (href) {
        router.push(href)
        return
      }
      onClick?.()
      return
    }
    onActivate?.()
  }

  return (
    <button
      type="button"
      onClick={handlePress}
      className={classNameValue}
      aria-label={label}
      data-state={active ? "active" : "inactive"}
    >
      <Icon className="size-4 shrink-0 text-current" />
      <span className="dashboard-quick-action-pill-label text-current">{label}</span>
    </button>
  )
}
