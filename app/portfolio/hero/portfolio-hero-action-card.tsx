import type { ComponentType, SVGProps } from "react"

type PortfolioHeroActionCardProps = {
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  onClick?: () => void
  className?: string
}

export function PortfolioHeroActionCard({ label, icon: Icon, onClick, className }: PortfolioHeroActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[94px] flex-col items-start justify-between rounded-[16px] border border-[#01AACF]/18 bg-[#dff2fb] px-[22px] py-[14px] text-[#01AACF] shadow-none transition-colors hover:bg-[#d6eef9] dark:border-[#7DDCFF]/14 dark:bg-[#0f1b24] dark:text-[#7DDCFF] dark:hover:bg-[#142331] ${className ?? ""}`}
    >
      <Icon className="h-6 w-6 fill-current text-current" />
      <span className="text-[14px] font-semibold tracking-[-0.02em] text-current">{label}</span>
    </button>
  )
}
