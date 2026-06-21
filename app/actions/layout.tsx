import type { ReactNode } from "react"

export default function ActionsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-background">{children}</div>
}
