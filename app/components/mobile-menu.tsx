"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleHelp, Coins, Globe2, Menu, Shield, SunMedium } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { CurrencyFlag } from "./currency-flag"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { useTheme } from "./theme-provider"

const siteRoutes = {
  home: "/",
}

type MobileMenuView = "root" | "language" | "currency"

type MobileMenuProps = {
  actions?: ReactNode
  brand?: ReactNode
}

export function MobileMenu({ actions, brand }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const [isShown, setIsShown] = useState(false)
  const [settingsIntroActive, setSettingsIntroActive] = useState(false)
  const [view, setView] = useState<MobileMenuView>("root")
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { language, setLanguage, currency, setCurrency } = useDisplayPreferences()
  const accentClass = "text-[#01AACF]"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
    setIsShown(false)
    setSettingsIntroActive(false)
    setView("root")
  }, [pathname])

  useEffect(() => {
    if (!open) {
      setIsShown(false)
      setSettingsIntroActive(false)
      return
    }

    setSettingsIntroActive(true)
    const frame = window.requestAnimationFrame(() => {
      setIsShown(true)
    })
    const timer = window.setTimeout(() => {
      setSettingsIntroActive(false)
    }, 820)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        setIsShown(false)
        setSettingsIntroActive(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const onClose = () => {
    setOpen(false)
    setIsShown(false)
    setSettingsIntroActive(false)
    setView("root")
  }

  const mainLinks = [
    {
      href: siteRoutes.home,
      label: "Express",
    },
    {
      href: "/borrow",
      label: "Borrow",
    },
    {
      href: "/lend",
      label: "Invest",
    },
    {
      href: "/perps",
      label: "Trade",
    },
    {
      href: "/portfolio",
      label: "Portfolio",
    },
    {
      href: "/rewards",
      label: "Rewards",
    },
  ] as const

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0]
  const currentCurrency = CURRENCY_OPTIONS.find((option) => option.code === currency) ?? CURRENCY_OPTIONS[0]
  const lightModeEnabled = mounted ? resolvedTheme === "light" : false
  const isVisible = open && isShown

  const rootSettingsClass =
    "flex w-full items-center justify-between gap-4 text-left text-[1.2rem] font-medium leading-[1.14] text-foreground/92"
  const rootSettingsLabelClass = "flex items-center gap-3"
  const rootSettingsIconClass = `h-[1.15rem] w-[1.15rem] stroke-[1.9] ${accentClass}`
  const dividerClass = "border-[#01AACF]/25 dark:border-[#01AACF]/35"
  const selectorPanelClass = `rounded-[1.75rem] border ${dividerClass} bg-background px-5 py-5`
  const introDelay = (index: number) => `${120 + index * 35}ms`
  const settingsIntroStyle = (index: number) =>
    settingsIntroActive
      ? {
          animationName: "mobile-menu-item-in",
          animationDuration: "300ms",
          animationTimingFunction: "ease-out",
          animationFillMode: "both" as const,
          animationDelay: introDelay(index),
        }
      : undefined

  function renderRootMenu() {
    return (
      <>
        <ol>
          {mainLinks.map((link, index) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

            return (
              <li
                key={link.href}
                className={`border-b ${dividerClass} transition-all duration-300 ease-out ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
                style={{ transitionDelay: introDelay(index) }}
              >
                <Link
                  href={link.href}
                  prefetch={false}
                  onClick={onClose}
                  className="flex items-end justify-between gap-5 py-3"
                >
                  <span
                    className={`text-[clamp(1.5rem,6.1vw,2.1rem)] font-[560] leading-[1.02] tracking-[-0.04em] ${
                      isActive ? "text-foreground" : "text-foreground/95"
                    }`}
                  >
                    {link.label}
                  </span>
                  <span className="shrink-0 pb-0.5 text-[0.88rem] font-medium tracking-[-0.02em] text-[#01AACF]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>

        <ul className="mt-8 space-y-5">
          <li
            className="translate-y-0 opacity-100"
            style={settingsIntroStyle(mainLinks.length)}
          >
            <button type="button" onClick={() => setView("language")} className={rootSettingsClass}>
              <span className={rootSettingsLabelClass}>
                <Globe2 className={rootSettingsIconClass} />
                <span>Language</span>
              </span>
              <span className="flex items-center gap-2 text-[1rem] text-muted-foreground">
                {currentLanguage.label}
                <ChevronRight className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
              </span>
            </button>
          </li>
          <li
            className="translate-y-0 opacity-100"
            style={settingsIntroStyle(mainLinks.length + 1)}
          >
            <button type="button" onClick={() => setView("currency")} className={rootSettingsClass}>
              <span className={rootSettingsLabelClass}>
                <Coins className={rootSettingsIconClass} />
                <span>Currency</span>
              </span>
              <span className="flex items-center gap-2 text-[1rem] text-muted-foreground">
                {currentCurrency.code}
                <ChevronRight className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
              </span>
            </button>
          </li>
          <li
            className="translate-y-0 opacity-100"
            style={settingsIntroStyle(mainLinks.length + 2)}
          >
            <div className={rootSettingsClass}>
              <span className={rootSettingsLabelClass}>
                <SunMedium className={rootSettingsIconClass} />
                <span>Light Mode</span>
              </span>
              <Switch
                checked={lightModeEnabled}
                onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
                aria-label="Toggle light mode"
                className="data-[state=checked]:bg-[#01AACF] data-[state=unchecked]:bg-[#01AACF]/35"
              />
            </div>
          </li>
          <li
            className="translate-y-0 opacity-100"
            style={settingsIntroStyle(mainLinks.length + 3)}
          >
            <Link href="/support-center" prefetch={false} onClick={onClose} className={rootSettingsClass}>
              <span className={rootSettingsLabelClass}>
                <CircleHelp className={rootSettingsIconClass} />
                <span>Help Center</span>
              </span>
              <ArrowUpRight className="h-[1.1rem] w-[1.1rem] text-[#01AACF]" />
            </Link>
          </li>
          <li
            className="translate-y-0 opacity-100"
            style={settingsIntroStyle(mainLinks.length + 4)}
          >
            <a
              href="https://avana-ashen.vercel.app/privacy"
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className={rootSettingsClass}
            >
              <span className={rootSettingsLabelClass}>
                <Shield className={rootSettingsIconClass} />
                <span>Security & privacy</span>
              </span>
              <ArrowUpRight className="h-[1.1rem] w-[1.1rem] text-[#01AACF]" />
            </a>
          </li>
        </ul>
      </>
    )
  }

  function renderPanelHeader(title: string, backView: MobileMenuView) {
    return (
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setView(backView)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-surface-inset"
          aria-label="Back to menu"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-[1.9rem] font-medium leading-none tracking-[-0.04em] text-foreground">{title}</h2>
      </div>
    )
  }

  function renderLanguageList() {
    return (
      <div className={selectorPanelClass}>
        {renderPanelHeader("Language", "root")}
        <ul className="space-y-1">
          {LANGUAGE_OPTIONS.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(option.code)
                  setView("root")
                }}
                className="flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-4 text-left"
              >
                <span className="text-[1.15rem] font-medium leading-tight text-foreground">{option.label}</span>
                {option.code === language ? <Check className="h-6 w-6 text-brand" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  function renderCurrencyList() {
    return (
      <div className={selectorPanelClass}>
        {renderPanelHeader("Currency", "root")}
        <ul className="space-y-1">
          {CURRENCY_OPTIONS.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                onClick={() => {
                  setCurrency(option.code)
                  setView("root")
                }}
                className="flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-4 text-left"
              >
                <span className="flex items-center gap-4">
                  <CurrencyFlag code={option.code} className="h-6 w-6" />
                  <span className="text-[1.15rem] font-medium leading-tight text-foreground">{option.label}</span>
                </span>
                {option.code === currency ? <Check className="h-6 w-6 text-brand" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center text-[#01AACF] transition hover:text-[#01AACF]/80 focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent] md:hidden"
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="mobile-site-nav"
        onClick={() => setOpen((currentValue) => !currentValue)}
      >
        <Menu className="h-7 w-7" strokeWidth={1.8} />
        <span className="sr-only">Toggle menu</span>
      </button>

      <div
        className={`fixed inset-0 z-[60] min-h-[100dvh] bg-background text-foreground transition-opacity duration-300 ease-out md:hidden ${
          isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
        aria-hidden={!isVisible}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={siteRoutes.home}
              prefetch={false}
              aria-label="Avana"
              className="inline-flex items-center"
              onClick={onClose}
            >
              {brand}
            </Link>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center text-[#01AACF] transition hover:text-[#01AACF]/80 focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent]"
              aria-label="Close menu"
              onClick={onClose}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M5 5L17 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M17 5L5 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {actions ? <div className="flex items-center gap-0.5">{actions}</div> : null}
        </div>

        <nav
          id="mobile-site-nav"
          aria-label="Mobile navigation"
          className={`h-[calc(100dvh-4rem)] overflow-y-auto px-4 pb-10 pt-10 transition-all duration-300 ease-out sm:px-6 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {view === "root" ? renderRootMenu() : null}
          {view === "language" ? renderLanguageList() : null}
          {view === "currency" ? renderCurrencyList() : null}
        </nav>
      </div>
    </>
  )
}
