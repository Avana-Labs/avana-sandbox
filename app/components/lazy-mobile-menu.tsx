"use client"

import dynamic from "next/dynamic"
import { Menu } from "@/app/components/icons"
import type { ReactNode } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"

function MobileMenuFallback() {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-label={t("Toggle menu")}
      aria-expanded={false}
      className="inline-flex h-10 w-10 items-center justify-center text-[#01AACF] transition hover:text-[#01AACF]/80 focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent] xl:hidden"
    >
      <Menu className="h-7 w-7" strokeWidth={1.8} />
    </button>
  )
}

const MobileMenu = dynamic(() => import("./mobile-menu").then((mod) => mod.MobileMenu), {
  ssr: false,
  loading: () => <MobileMenuFallback />,
})

export function LazyMobileMenu({ actions, brand }: { actions?: ReactNode; brand?: ReactNode }) {
  return <MobileMenu actions={actions} brand={brand} />
}
