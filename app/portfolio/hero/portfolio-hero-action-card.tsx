import Link from "next/link"
import type { ComponentType, SVGProps } from "react"

type PortfolioHeroActionCardProps = {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  href?: string
  onClick?: () => void
  className?: string
}

export function PortfolioHeroActionCard({ label, icon: Icon, href, onClick, className }: PortfolioHeroActionCardProps) {
  const classNameValue = `flex min-h-[94px] flex-col items-start justify-between rounded-[16px] border border-brand/18 bg-[#dff2fb] px-[22px] py-[14px] text-brand shadow-none transition-colors hover:bg-[#d6eef9] dark:border-[#7DDCFF]/14 dark:bg-[#0f1b24] dark:text-[#7DDCFF] dark:hover:bg-[#142331] ${className ?? ""}`

  if (href) {
    return (
      <Link href={href} className={classNameValue}>
        <Icon className="h-6 w-6 fill-current text-current" />
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
