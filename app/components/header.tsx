"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { BrandIcon, BrandLogo } from "./brand-logo"
import { LazyMobileMenu } from "./lazy-mobile-menu"
import { LazySearchCommand, LazySearchCommandIconOnly, SearchCommandIconPlaceholder, SearchCommandPlaceholder } from "./lazy-search-command"
import { personalDesktopHeaderLinks } from "./site-nav"
import { WalletControl } from "@/app/components/wallet-control"
import { DesktopPreferenceControls } from "./desktop-preference-controls"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"

export function Header() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { modalOpen: walletModalOpen } = useWalletGate()
  const desktopLinks = personalDesktopHeaderLinks
  const [mounted, setMounted] = useState(false)
  const [showDivider, setShowDivider] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const renderMobileBrand = () => <BrandIcon />
  const renderMobileActions = () => (
    <>
      <span className="-mr-1 flex items-center">
        {mounted ? <LazySearchCommandIconOnly /> : <SearchCommandIconPlaceholder />}
      </span>
      <span className="flex items-center">
        <WalletControl size="mobile" />
      </span>
    </>
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const header = headerRef.current
    let threshold = header?.offsetHeight ?? 68
    let pendingOffset = 0
    let frame: number | null = null

    const readScrollOffset = (target?: EventTarget | null) => {
      if (target instanceof HTMLElement) {
        return target.scrollTop
      }

      return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)
    }

    const commitDivider = () => {
      frame = null
      setShowDivider(pendingOffset > threshold)
    }

    const updateDivider = (event?: Event) => {
      pendingOffset = readScrollOffset(event?.target)
      if (frame === null) frame = window.requestAnimationFrame(commitDivider)
    }

    updateDivider()
    let resizeObserver: ResizeObserver | null = null
    if (header && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        threshold = header.offsetHeight
        updateDivider()
      })
      resizeObserver.observe(header)
    }
    window.addEventListener("scroll", updateDivider, { passive: true })
    document.addEventListener("scroll", updateDivider, { capture: true, passive: true })

    return () => {
      resizeObserver?.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", updateDivider)
      document.removeEventListener("scroll", updateDivider, true)
    }
  }, [mounted])

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 bg-background/95 text-foreground transition-[box-shadow] duration-200 ${
        walletModalOpen ? "" : "backdrop-blur"
      } ${
        mounted && showDivider ? "shadow-[inset_0_-1px_0_hsl(var(--border))]" : "shadow-none"
      }`}
    >
      <div className="hidden lg:block">
        <div className="grid h-[68px] w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 px-3 sm:px-4 lg:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,410px)_minmax(0,1fr)] xl:gap-4 xl:px-6 2xl:px-8">
          <div className="flex min-w-0 items-center gap-4 overflow-hidden xl:gap-5">
            <Link href="/" aria-label={t("Home")} title={t("Home")} className="flex shrink-0 items-center">
              <span className="xl:hidden">
                <BrandIcon />
              </span>
              <BrandLogo className="hidden h-[44px] xl:block" />
            </Link>

            <nav aria-label={t("Primary")} className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {desktopLinks.slice(0, 4).map((link) => {
                const isActive = mounted && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={t(link.label)}
                    title={t(link.label)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors xl:px-3 xl:py-2 xl:text-[16px] ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{t(link.label)}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="hidden min-w-0 justify-center px-1 xl:flex xl:px-2">
            <div className="w-full max-w-[280px] xl:max-w-[360px]">{mounted ? <LazySearchCommand /> : <SearchCommandPlaceholder />}</div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 xl:gap-2.5">
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {desktopLinks.slice(4).map((link) => {
                const isActive = mounted && pathname.startsWith(link.href)
                const Icon = link.icon

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-label={t(link.label)}
                    title={t(link.label)}
                    className={`group inline-flex items-center rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors xl:px-3 xl:py-2 xl:text-[16px] ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {Icon ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-[#01AACF] transition-transform duration-200 ease-out group-hover:-translate-y-[1px] xl:mr-2">
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                      </span>
                    ) : null}
                    <span className="hidden xl:inline">{t(link.label)}</span>
                  </Link>
                )
              })}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DesktopPreferenceControls />
              <div className="flex shrink-0">
                <WalletControl size="desktop" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="relative flex h-16 w-full items-center justify-between bg-background px-4 text-foreground sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label={t("Home")} title={t("Home")} className="inline-flex items-center">
              {renderMobileBrand()}
            </Link>

            <LazyMobileMenu brand={renderMobileBrand()} />
          </div>

          <div className="flex items-center gap-0.5">
            {renderMobileActions()}
          </div>
        </div>
      </div>
    </header>
  )
}
