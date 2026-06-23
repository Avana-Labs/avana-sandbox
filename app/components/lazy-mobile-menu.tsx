"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"

const MobileMenu = dynamic(() => import("./mobile-menu").then((mod) => mod.MobileMenu), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      aria-label="Toggle menu"
      aria-expanded={false}
      className="inline-flex h-10 w-10 items-center justify-center text-[#007a99] md:hidden"
    >
      <span className="sr-only">Toggle menu</span>
    </button>
  ),
})

export function LazyMobileMenu({ actions, brand }: { actions?: ReactNode; brand?: ReactNode }) {
  return <MobileMenu actions={actions} brand={brand} />
}
