import type { LucideIcon } from "lucide-react"

type PortfolioHeroActionCardProps = {
  label: string
  icon: LucideIcon
  onClick?: () => void
  className?: string
}

export function PortfolioHeroActionCard({ label, icon: Icon, onClick, className }: PortfolioHeroActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[118px] flex-col items-center justify-center gap-3 rounded-[20px] border border-[#f3e3f2] bg-[#fbf1fb] px-4 py-5 text-[#FF007A] transition-colors hover:bg-[#fff0f7] ${className ?? ""}`}
    >
      <Icon className="h-6 w-6" strokeWidth={1.75} />
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  )
}
