"use client"

import Link from "next/link"
import { CircleHelp, MoreHorizontal, MoonStar, Search, SunMedium } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrandLogo } from "./brand-logo"
import { MobileMenu } from "./mobile-menu"
import { personalDesktopHeaderLinks } from "./site-nav"

function PreferencesMenu() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open preferences"
          title="Preferences"
          className="inline-flex size-9 items-center justify-center rounded-full bg-surface-inset text-muted-foreground transition-colors hover:text-foreground dark:bg-surface-2"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-2 text-[16px] font-medium normal-case tracking-normal text-foreground">
          Global preferences
        </DropdownMenuLabel>
        <div className="px-2 pb-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-normal text-muted-foreground">Theme</span>
            <div className="flex items-center overflow-hidden rounded-full border border-border bg-background">
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`px-3.5 py-1.5 text-[13px] font-medium ${
                  mounted && resolvedTheme === "system" ? "bg-surface-inset text-foreground" : "text-muted-foreground"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-2.5 py-1.5 text-[13px] font-medium ${
                  mounted && resolvedTheme === "light" ? "bg-surface-inset text-foreground" : "text-muted-foreground"
                }`}
              >
                <SunMedium className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-2.5 py-1.5 text-[13px] font-medium ${
                  mounted && resolvedTheme === "dark" ? "bg-surface-inset text-foreground" : "text-muted-foreground"
                }`}
              >
                <MoonStar className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground">
          <span className="text-muted-foreground">Language</span>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground">
          <span className="text-muted-foreground">Currency</span>
          <span>USD</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-2 py-2.5 text-[14px] font-normal text-foreground">
          <CircleHelp className="mr-2 h-3.5 w-3.5" />
          Support center
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const pathname = usePathname()
  const desktopLinks = personalDesktopHeaderLinks

  return (
    <header className="sticky top-0 z-40 bg-background/95 text-foreground backdrop-blur">
      <div className="hidden lg:block">
          <div className="relative mx-auto flex h-[68px] w-full max-w-[2200px] -translate-y-2 items-center justify-between px-6 xl:px-10 2xl:px-12">
            <div className="flex shrink-0 items-center gap-2.5">
              <Link href="/" aria-label="Home" title="Home" className="flex shrink-0 items-center">
                <BrandLogo />
              </Link>

              <nav aria-label="Primary" className="flex min-w-0 items-center gap-0.5">
                {desktopLinks.slice(0, 4).map((link) => {
                  const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="absolute left-1/2 flex w-full max-w-[320px] -translate-x-1/2 justify-center px-4">
              <button
                type="button"
                aria-label="Search"
                className="flex h-9 w-full items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-left text-[14px] font-normal text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:bg-surface-inset dark:bg-surface-2 dark:hover:bg-surface-hover dark:shadow-none"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">Search tokens, pools, wallets</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-[6px] border border-border bg-background px-1 text-[10px] font-normal text-muted-foreground dark:bg-surface-inset">
                  /
                </span>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <div className="mr-1 flex items-center gap-0.5">
                {desktopLinks.slice(4).map((link) => {
                  const isActive = pathname.startsWith(link.href)

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>

              <PreferencesMenu />

              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full bg-accent-primary px-4 font-sans text-[15px] font-medium text-accent-primary-foreground shadow-none transition-colors hover:bg-accent-primary-hover"
              >
                Connect
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex h-14 w-full items-center gap-3 px-4">
            <Link href="/" aria-label="Home" title="Home" className="shrink-0 flex items-center">
              <BrandLogo mobileOnly />
            </Link>

            <div className="ml-auto">
              <MobileMenu />
            </div>
          </div>
        </div>
    </header>
  )
}
