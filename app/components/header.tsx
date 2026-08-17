"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { BrandIcon, BrandLogo } from "./brand-logo"
import { LazyMobileMenu } from "./lazy-mobile-menu"
import {
  LazySearchCommand,
  LazySearchCommandIconOnly,
  SearchCommandIconPlaceholder,
  SearchCommandPlaceholder,
} from "./lazy-search-command"
import { personalDesktopHeaderLinks } from "./site-nav"
import { WalletControl } from "@/app/components/wallet-control"
import { DesktopPreferenceControls } from "./desktop-preference-controls"

export function Header() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const desktopLinks = personalDesktopHeaderLinks
  const [mounted, setMounted] = useState(false)
  const [showDivider, setShowDivider] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const renderMobileBrand = () => <BrandIcon />
  const renderMobileActions = () => (
    <>
      <span className="-me-1 flex items-center">
        {mounted ? <LazySearchCommandIconOnly tone="brand" /> : <SearchCommandIconPlaceholder tone="brand" />}
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

  const renderPrimaryLinks = (compact: boolean) =>
    desktopLinks.slice(0, 4).map((link) => {
      const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
      const Icon = link.icon

      return (
        <Link
          key={link.href}
          href={link.href}
          aria-label={t(link.label)}
          title={t(link.label)}
          className={`inline-flex items-center rounded-full font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
            compact ? "px-2.5 py-1.5" : "px-3 py-2"
          } ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {Icon ? (
            <span className="me-2 inline-flex h-5 w-5 items-center justify-center text-current">
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            </span>
          ) : null}
          <span>{t(link.label)}</span>
        </Link>
      )
    })

  const renderUtilityLinks = (compact: boolean) =>
    desktopLinks.slice(4).map((link) => {
      const isActive = pathname.startsWith(link.href)
      const Icon = link.icon

      return (
        <Link
          key={link.href}
          href={link.href}
          aria-label={t(link.label)}
          title={t(link.label)}
          className={`group inline-flex items-center rounded-full font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
            compact ? "px-1.5 py-1.5" : "px-3 py-2"
          } ${
            isActive
              ? "text-brand dark:text-[#7DDCFF]"
              : "text-muted-foreground hover:text-brand dark:hover:text-[#7DDCFF]"
          }`}
        >
          {Icon ? (
            <span
              className={`inline-flex items-center justify-center text-current transition-transform duration-200 ease-out group-hover:-translate-y-[1px] ${
                compact ? "h-9 w-9" : "me-2 h-6 w-6"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            </span>
          ) : null}
          {compact ? null : <span>{t(link.label)}</span>}
        </Link>
      )
    })

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 bg-background text-foreground transition-[box-shadow] duration-200 ${
        mounted && showDivider ? "shadow-[inset_0_-1px_0_hsl(var(--border))]" : "shadow-none"
      }`}
    >
      {/* Full desktop: wide enough for wordmark, labels, and center search (14"+ / large monitors). */}
      <div className="hidden min-[1440px]:block">
        <div className="grid h-[68px] w-full grid-cols-[minmax(0,1fr)_minmax(280px,410px)_minmax(0,1fr)] items-center gap-4 px-6 2xl:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" aria-label={t("Home")} title={t("Home")} className="flex shrink-0 items-center">
              <BrandLogo className="h-[44px]" />
            </Link>

            <nav
              aria-label={t("Primary")}
              className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {renderPrimaryLinks(false)}
            </nav>
          </div>

          <div className="flex min-w-0 justify-center px-2">
            <div className="w-full max-w-[360px]">{mounted ? <LazySearchCommand /> : <SearchCommandPlaceholder />}</div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2.5">
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {renderUtilityLinks(false)}
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

      {/* iPad / mid laptop (lg–1439px): compact desktop chrome, not the phone menu. */}
      <div className="hidden lg:block min-[1440px]:hidden">
        <div className="grid h-[68px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label={t("Home")} title={t("Home")} className="flex shrink-0 items-center">
              <BrandLogo className="h-[44px]" />
            </Link>

            <nav
              aria-label={t("Primary")}
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {renderPrimaryLinks(true)}
            </nav>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <div className="flex items-center gap-0.5">{renderUtilityLinks(true)}</div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span className="flex items-center">
                {mounted ? <LazySearchCommandIconOnly /> : <SearchCommandIconPlaceholder />}
              </span>
              <DesktopPreferenceControls />
              <div className="flex shrink-0">
                <WalletControl size="desktop" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone / portrait tablet */}
      <div className="lg:hidden">
        <div className="relative flex h-16 w-full items-center justify-between bg-background px-4 text-foreground sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label={t("Home")} title={t("Home")} className="inline-flex items-center">
              {renderMobileBrand()}
            </Link>

            <LazyMobileMenu brand={renderMobileBrand()} />
          </div>

          <div className="flex items-center gap-0.5">{renderMobileActions()}</div>
        </div>
      </div>
    </header>
  )
}
