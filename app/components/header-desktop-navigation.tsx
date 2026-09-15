"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  desktopPrimaryLinks,
  hasPanel,
  menuIdForHref,
  type DesktopMenuId,
} from "@/app/components/header-desktop-menu-data"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const DeferredHeaderDesktopMenuPanel = dynamic(() => import("@/app/components/header-desktop-menu-panel"), {
  ssr: false,
})

let desktopMenuPanelPromise: Promise<unknown> | null = null

function warmDesktopMenuPanel() {
  desktopMenuPanelPromise ??= import("@/app/components/header-desktop-menu-panel")
}

const PILL_CLASS =
  "site-header-nav-pill inline-flex shrink-0 items-center rounded-full font-sans text-[15px] font-normal leading-5 transition-colors px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function HeaderDesktopNavigation({
  isSignedIn = false,
  onOpenChange,
}: {
  isSignedIn?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const pathname = usePathname() || "/"
  const [desktopMenuOpen, setDesktopMenuOpen] = useState<DesktopMenuId | null>(null)
  const [desktopMenuRendered, setDesktopMenuRendered] = useState<DesktopMenuId | null>(null)
  const [desktopMenuAnimationCycle, setDesktopMenuAnimationCycle] = useState(0)
  const [focusPanel, setFocusPanel] = useState(false)
  const desktopCloseTimeoutRef = useRef<number | null>(null)
  const navigationRef = useRef<HTMLElement>(null)

  const clearDesktopCloseTimeout = () => {
    if (desktopCloseTimeoutRef.current !== null) {
      window.clearTimeout(desktopCloseTimeoutRef.current)
      desktopCloseTimeoutRef.current = null
    }
  }

  const openDesktopMenu = (menuId: DesktopMenuId) => {
    warmDesktopMenuPanel()
    clearDesktopCloseTimeout()
    setDesktopMenuRendered(menuId)
    setDesktopMenuOpen(menuId)
    setDesktopMenuAnimationCycle((current) => current + 1)
  }

  const scheduleDesktopMenuClose = () => {
    clearDesktopCloseTimeout()
    desktopCloseTimeoutRef.current = window.setTimeout(() => {
      setDesktopMenuOpen(null)
      desktopCloseTimeoutRef.current = null
    }, 110)
  }

  const closeDesktopMenu = () => {
    clearDesktopCloseTimeout()
    setDesktopMenuOpen(null)
  }

  useEffect(() => () => clearDesktopCloseTimeout(), [])

  // Surface the open state so the header can show its divider line while a panel is open.
  useEffect(() => {
    onOpenChange?.(desktopMenuOpen !== null)
  }, [desktopMenuOpen, onOpenChange])

  useEffect(() => {
    if (!desktopMenuOpen) return
    const panelId = `desktop-menu-${desktopMenuOpen}`
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      Boolean(navigationRef.current?.contains(target) || document.getElementById(panelId)?.contains(target))
    const dismissOutside = (event: Event) => {
      if (!isInside(event.target)) setDesktopMenuOpen(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      setDesktopMenuOpen(null)
      navigationRef.current?.querySelector<HTMLElement>(`[aria-controls="${panelId}"]`)?.focus()
    }
    document.addEventListener("keydown", escape)
    document.addEventListener("pointerdown", dismissOutside)
    document.addEventListener("focusin", dismissOutside)
    return () => {
      document.removeEventListener("keydown", escape)
      document.removeEventListener("pointerdown", dismissOutside)
      document.removeEventListener("focusin", dismissOutside)
    }
  }, [desktopMenuOpen])

  return (
    <>
      <nav
        ref={navigationRef}
        aria-label={t("Primary")}
        className="flex items-center gap-0.5 whitespace-nowrap"
        onMouseEnter={warmDesktopMenuPanel}
        onMouseLeave={scheduleDesktopMenuClose}
      >
        {desktopPrimaryLinks.map((link) => {
          const menuId = menuIdForHref(link.href)
          const isSection = isActiveHref(pathname, link.href)

          if (menuId && hasPanel(menuId)) {
            const isOpen = desktopMenuOpen === menuId
            const isHighlighted = isOpen || isSection
            return (
              <button
                key={link.href}
                type="button"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={`desktop-menu-${menuId}`}
                onMouseEnter={() => {
                  setFocusPanel(false)
                  openDesktopMenu(menuId)
                }}
                onFocus={warmDesktopMenuPanel}
                onClick={() => {
                  setFocusPanel(true)
                  openDesktopMenu(menuId)
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown") return
                  event.preventDefault()
                  setFocusPanel(true)
                  openDesktopMenu(menuId)
                }}
                className={`${PILL_CLASS} ${isHighlighted ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="whitespace-nowrap">{t(link.label)}</span>
              </button>
            )
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={isSignedIn}
              onMouseEnter={closeDesktopMenu}
              onFocus={closeDesktopMenu}
              className={`${PILL_CLASS} ${isSection ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="whitespace-nowrap">{t(link.label)}</span>
            </Link>
          )
        })}
      </nav>

      {desktopMenuRendered !== null ? (
        <DeferredHeaderDesktopMenuPanel
          menuId={desktopMenuRendered}
          isOpen={desktopMenuOpen !== null}
          onOpen={clearDesktopCloseTimeout}
          onClose={scheduleDesktopMenuClose}
          onExited={() => setDesktopMenuRendered(null)}
          animationCycle={desktopMenuAnimationCycle}
          focusOnOpen={focusPanel}
        />
      ) : null}
    </>
  )
}
