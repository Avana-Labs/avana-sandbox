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
      className={`flex min-h-[118px] flex-col items-start justify-between rounded-[22px] border border-[#01AACF]/18 bg-[#dff2fb] px-5 py-4 text-[#01AACF] transition-colors hover:bg-[#d6eef9] ${className ?? ""}`}
    >
      <Icon className="h-7 w-7 fill-current text-[#01AACF]" />
      <span className="text-[14px] font-semibold tracking-[-0.02em] text-[#01AACF]">{label}</span>
    </button>
  )
}
