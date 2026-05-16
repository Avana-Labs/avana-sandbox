"use client"

import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { MobileMenu } from "./mobile-menu"
import { businessDesktopHeaderLinks, getHeaderMode, personalDesktopHeaderLinks } from "./site-nav"

const utilityLinks = ["My Rewards", "English/USD", "Support Center"]
const modeConfig = {
  personal: {
    label: "Personal",
    href: "/",
    accent: "#01AACF",
    logo: "/Avana Full (Personal) PNG.png",
  },
  business: {
    label: "Business",
    href: "/business",
    accent: "#BC846F",
    logo: "/Avana Full (Business) PNG.png",
  },
} as const

function ThemeStatusLabel() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const label = !mounted ? "Theme" : resolvedTheme === "dark" ? "Dark Theme" : "Light Theme"
  const handleClick = () => {
    if (!mounted) return
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="whitespace-nowrap transition-colors hover:text-[#272a2f]"
      aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme` : "Theme toggle"}
    >
      {label}
    </button>
  )
}

export function Header() {
  const pathname = usePathname()
  const mode = getHeaderMode(pathname)
  const desktopLinks = mode === "business" ? businessDesktopHeaderLinks : personalDesktopHeaderLinks
  const activeMode = modeConfig[mode]
  const desktopNavItemWidth = mode === "business" ? "w-[132px]" : "w-[96px]"

  return (
    <header className="sticky top-0 z-40 bg-background text-foreground">
      <div className="hidden h-[3px] w-full bg-border lg:block" />

      <div className="hidden lg:block">
        <div className="border-b border-border bg-card">
          <div className="mx-auto grid h-[32px] max-w-5xl grid-cols-[126px_minmax(0,1fr)] items-end gap-3">
            <div aria-hidden />
            <div className="flex min-w-0 items-end justify-between gap-5">
              <div className="ml-[72px] inline-flex h-[28px] shrink-0 overflow-hidden rounded-t-[2px] border border-b-0 border-border bg-surface-2 text-[13px] font-semibold leading-none">
                {(["personal", "business"] as const).map((item) => {
                  const isActive = item === mode
                  const config = modeConfig[item]

                  return (
                    <Link
                      key={item}
                      href={config.href}
                      className="flex min-w-[88px] items-center justify-center px-4 text-center text-foreground transition-colors hover:bg-surface-1"
                      style={isActive ? { backgroundColor: config.accent, color: "#ffffff" } : undefined}
                    >
                      {config.label}
                    </Link>
                  )
                })}
              </div>

              <div className="flex min-w-0 items-center gap-[8px] pb-[4px] text-[11px] font-medium leading-none text-muted-foreground">
                {utilityLinks.map((item, index) => (
                  <div key={item} className="flex shrink-0 items-center gap-[8px]">
                    {index > 0 ? <span className="text-muted-foreground/40">|</span> : null}
                    <span className="whitespace-nowrap">{item}</span>
                  </div>
                ))}
                <div className="flex shrink-0 items-center gap-[8px]">
                  <span className="text-muted-foreground/40">|</span>
                  <ThemeStatusLabel />
                </div>

                <div className="ml-[6px] flex h-[26px] w-[230px] shrink-0 items-center border border-border bg-background px-[10px] text-muted-foreground shadow-elev-1">
                  <Search className="h-[14px] w-[14px] shrink-0 text-muted-foreground" strokeWidth={2.2} />
                  <span className="ml-[8px] min-w-0 flex-1 truncate text-[11px] font-medium">Search</span>
                  <span className="ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-surface-1 px-[5px] text-[11px] font-medium leading-none text-muted-foreground">
                    /
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background" style={{ borderTop: `3px solid ${activeMode.accent}` }}>
          <div className="mx-auto grid h-[60px] max-w-5xl grid-cols-[126px_minmax(0,1fr)] items-center gap-3">
            <Link href={mode === "business" ? "/business" : "/"} aria-label="Home" title="Home" className="flex items-center justify-start">
              <Image src={activeMode.logo} alt="Avana" width={300} height={150} className="h-[52px] w-auto object-contain" priority />
            </Link>

            <div className="flex items-center justify-start">
              <nav className="flex h-[42px] w-full items-stretch border border-border bg-background shadow-elev-1">
                <div className="flex min-w-0 flex-1 items-stretch">
                  {desktopLinks.map((link) => {
                    const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`relative flex ${desktopNavItemWidth} shrink-0 items-center justify-center border-r border-border bg-background px-3 text-[13px] font-medium leading-none text-foreground transition-colors hover:bg-surface-1`}
                      >
                        <span
                          className="absolute inset-x-0 bottom-0 h-[3px] opacity-0"
                          style={isActive ? { backgroundColor: activeMode.accent, opacity: 1 } : undefined}
                        />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    )
                  })}
                  <div className="min-w-0 flex-1" aria-hidden />
                </div>

                <div className="relative flex w-[128px] shrink-0 items-center justify-end px-[10px]">
                  <Link
                    href="/login"
                    className="px-[18px] py-[8px] text-[13px] font-medium leading-none text-white shadow-elev-1 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: activeMode.accent }}
                  >
                    LOGIN
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex h-14 w-full items-center gap-4 bg-background px-4">
          <Link href="/" aria-label="Home" title="Home" className="shrink-0 flex items-center">
            <Image
              src="/Avana Full (Personal) PNG.png"
              alt="Avana"
              width={142}
              height={30}
              className="h-14 w-auto origin-left scale-[1.08] object-contain dark:invert"
              priority
            />
          </Link>

          <div className="ml-auto">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
