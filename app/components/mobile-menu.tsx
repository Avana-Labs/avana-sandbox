"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { siteNavLinks } from "./site-nav"

const siteRoutes = {
  home: "/",
}

type MobileMenuProps = {
  actions?: ReactNode
  brand?: ReactNode
}

export function MobileMenu({ actions, brand }: MobileMenuProps) {
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsVisible(false)
  }, [pathname])

  useEffect(() => {
    if (!isVisible) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVisible(false)
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
  }, [isVisible])

  const onClose = () => setIsVisible(false)

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent] md:hidden"
        aria-label="Toggle menu"
        aria-expanded={isVisible}
        aria-controls="mobile-site-nav"
        onClick={() => setIsVisible((currentValue) => !currentValue)}
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
        <div className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
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
              className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent]"
              aria-label="Close menu"
              onClick={onClose}
            >
              <X className="h-7 w-7" strokeWidth={1.8} />
            </button>
          </div>

          {actions ? <div className="flex items-center gap-0.5">{actions}</div> : null}
        </div>

        <nav
          id="mobile-site-nav"
          aria-label="Mobile navigation"
          className={`h-[calc(100dvh-4rem)] overflow-y-auto bg-background px-4 pb-10 pt-10 transition-all duration-300 ease-out sm:px-6 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <ul className="space-y-6">
            {siteNavLinks.map((link, index) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

              return (
                <li key={link.href} className="flex items-start justify-between gap-4">
                  <Link
                    href={link.href}
                    prefetch={false}
                    onClick={onClose}
                    className={`max-w-[calc(100%-2.5rem)] text-[clamp(1.7rem,7.1vw,2.45rem)] font-[560] leading-[0.98] tracking-[-0.05em] transition-colors ${
                      isActive ? "text-foreground" : "text-foreground/92 hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>

                  <span className="pt-1 text-[10px] font-medium tabular-nums tracking-[0.08em] text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}
