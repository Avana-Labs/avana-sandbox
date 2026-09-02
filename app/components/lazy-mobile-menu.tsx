"use client"

import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { Menu } from "@/app/components/icons"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type MobileMenuComponent = ComponentType<{ actions?: ReactNode; brand?: ReactNode; initialOpen?: boolean }>
let mobileMenuPromise: Promise<MobileMenuComponent> | null = null
const loadMobileMenu = () => {
  mobileMenuPromise ??= import("./mobile-menu").then((mod) => mod.MobileMenu)
  return mobileMenuPromise
}

function MobileMenuTrigger({ onIntent, onOpen }: { onIntent: () => void; onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-label={t("Toggle menu")}
      aria-expanded={false}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onClick={onOpen}
      className="inline-flex h-10 w-10 items-center justify-center text-[#01AACF] transition hover:text-[#01AACF]/80 focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent] xl:hidden"
    >
      <Menu className="h-7 w-7" strokeWidth={1.8} />
    </button>
  )
}

export function LazyMobileMenu({ actions, brand }: { actions?: ReactNode; brand?: ReactNode }) {
  const [requested, setRequested] = useState(false)
  const [Loaded, setLoaded] = useState<MobileMenuComponent | null>(null)

  useEffect(() => {
    if (!requested) return
    let active = true
    void loadMobileMenu().then((Component) => {
      if (active) setLoaded(() => Component)
    })
    return () => {
      active = false
    }
  }, [requested])

  if (Loaded) return <Loaded actions={actions} brand={brand} initialOpen />
  return <MobileMenuTrigger onIntent={() => void loadMobileMenu()} onOpen={() => setRequested(true)} />
}
