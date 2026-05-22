"use client"

import Link from "next/link"
import { CircleHelp, Eye, EyeOff, MoreHorizontal, MoonStar, SunMedium } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { BrandIcon, BrandLogo } from "./brand-logo"
import { useDisplayPreferences } from "./display-preferences"
import { MobileMenu } from "./mobile-menu"
import { SearchCommand } from "./search-command"
import { personalDesktopHeaderLinks } from "./site-nav"

function PreferencesMenu({ mobile = false }: { mobile?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { showDollarAmounts, setShowDollarAmounts } = useDisplayPreferences()
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
          className={
            mobile
              ? "inline-flex h-11 w-11 items-center justify-center text-[#6f6f6f] transition hover:text-[#2f2f2f] focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent]"
              : "inline-flex size-9 items-center justify-center rounded-full bg-surface-inset text-muted-foreground transition-colors hover:text-foreground dark:bg-surface-2"
          }
        >
          <MoreHorizontal className={mobile ? "h-6 w-6" : "h-4 w-4"} />
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
        <div className="flex items-center justify-between gap-3 px-2 py-2.5">
          <span className="flex items-center gap-2 text-[14px] font-normal text-muted-foreground">
            {showDollarAmounts ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Dollar amounts
          </span>
          <Switch
            checked={showDollarAmounts}
            onCheckedChange={setShowDollarAmounts}
            aria-label="Toggle dollar amounts"
          />
        </div>
        <DropdownMenuItem className="flex items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground">
          <span className="text-muted-foreground">Language</span>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground">
          <span className="text-muted-foreground">Currency</span>
          <span>USD</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2.5 text-[14px] font-normal text-foreground">
          <Link href="/support-center" className="flex items-center">
            <CircleHelp className="mr-2 h-3.5 w-3.5" />
            Support center
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const pathname = usePathname()
  const desktopLinks = personalDesktopHeaderLinks
  const renderMobileBrand = () => <BrandIcon className="h-8 w-8" />
  const renderMobileActions = () => (
    <>
      <span className="-mr-1 flex items-center gap-0 [&>button+button]:-ml-3">
        <SearchCommand iconOnly />
        <PreferencesMenu mobile />
      </span>
      <Link
        href="/login"
        className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
      >
        Connect
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 bg-background/95 text-foreground backdrop-blur">
      <div className="hidden lg:block">
          <div className="relative flex h-[68px] w-full -translate-y-2 items-center justify-between px-3 sm:px-4 lg:px-5 xl:px-6 2xl:px-8">
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
              <SearchCommand />
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
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 font-sans text-[15px] font-medium text-brand-foreground shadow-none transition-colors hover:bg-brand/90"
              >
                Connect
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="flex h-16 w-full items-center justify-between bg-white px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="Home" title="Home" className="inline-flex items-center">
                {renderMobileBrand()}
              </Link>

              <MobileMenu actions={renderMobileActions()} brand={renderMobileBrand()} />
            </div>

            <div className="flex items-center gap-0.5">
              {renderMobileActions()}
            </div>
          </div>
        </div>
    </header>
  )
}
