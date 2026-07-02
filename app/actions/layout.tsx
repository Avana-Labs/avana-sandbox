import type { ReactNode } from "react"
import { Header } from "@/app/components/header"

// Standalone /actions/* pages keep the full site header (logo, nav, search, wallet,
// and the shared currency/language/dollar-mask controls) — the same Header the rest
// of the app uses — instead of the old bare utility-icon strip. Embedded action
// flows (the home express card) render without this layout and keep the app chrome
// from the root layout.
export default function ActionsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      {children}
    </div>
  )
}
