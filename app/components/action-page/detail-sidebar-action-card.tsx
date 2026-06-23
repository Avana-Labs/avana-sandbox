import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DetailSidebarActionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-border bg-card shadow-elev-1",
        className,
      )}
      data-testid="detail-sidebar-action-card"
    >
      {children}
    </div>
  )
}
