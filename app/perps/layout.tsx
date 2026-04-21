import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export default function PerpsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("dark min-h-screen bg-background text-foreground")}>
      {children}
    </div>
  )
}
