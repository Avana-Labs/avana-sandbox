"use client"

import Link from "next/link"
import { Check, ChevronLeft, ChevronRight, CircleHelp, Coins, Eye, EyeOff, Globe2, MoreHorizontal, MoonStar, Shield, SunMedium } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { CurrencyFlag } from "./currency-flag"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS, useDisplayPreferences } from "./display-preferences"
import { LazyMobileMenu } from "./lazy-mobile-menu"
import { LazySearchCommand, LazySearchCommandIconOnly, SearchCommandIconPlaceholder, SearchCommandPlaceholder } from "./lazy-search-command"
import { useTheme } from "./theme-provider"
import { AVANA_EXTERNAL_LINKS } from "./external-links"
import { personalDesktopHeaderLinks } from "./site-nav"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { ConnectKitButton } from "connectkit"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"

/** Brand-styled wallet button that opens ConnectKit's real wallet modal. */
function WalletButton({ size = "desktop" }: { size?: "mobile" | "desktop" }) {
  const className =
    size === "mobile"
      ? "inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
      : "inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 font-sans text-[15px] font-medium text-brand-foreground shadow-none transition-colors hover:bg-brand/90"
  return (
    <ConnectKitButton.Custom>
      {({ show, isConnected, truncatedAddress, ensName }) => (
        <button type="button" aria-label={isConnected ? "Wallet" : "Connect"} className={className} onClick={show}>
          {isConnected ? (ensName ?? truncatedAddress ?? "Wallet") : "Connect"}
        </button>
      )}
    </ConnectKitButton.Custom>
  )
}

type PreferencesView = "root" | "language" | "currency"

function PreferencesMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { showDollarAmounts, setShowDollarAmounts, language, setLanguage, currency, setCurrency } = useDisplayPreferences()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PreferencesView>("root")

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0]
  const currentCurrency = CURRENCY_OPTIONS.find((option) => option.code === currency) ?? CURRENCY_OPTIONS[0]

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setView("root")
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open preferences"
          title="Preferences"
          className="inline-flex size-9 items-center justify-center rounded-full bg-surface-inset text-[#01AACF] transition-colors hover:text-[#01AACF]/80 dark:bg-surface-2"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-1.5">
        {view === "root" ? (
          <>
            <DropdownMenuLabel className="px-2 py-2 text-[16px] font-medium normal-case tracking-normal text-foreground">
              Global preferences
            </DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[14px] font-normal text-muted-foreground">
                  <SunMedium className="h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                  <span>Theme</span>
                </span>
                <div className="flex items-center overflow-hidden rounded-full border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`px-3.5 py-1.5 text-[13px] font-medium ${
                      mounted && theme === "system" ? "bg-surface-inset text-foreground" : "text-muted-foreground"
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
                {showDollarAmounts ? (
                  <Eye className="h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                )}
                Dollar amounts
              </span>
              <Switch
                checked={showDollarAmounts}
                onCheckedChange={setShowDollarAmounts}
                aria-label="Toggle dollar amounts"
              />
            </div>
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground"
              onSelect={(event) => {
                event.preventDefault()
                setView("language")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe2 className="h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                <span>Language</span>
              </span>
              <span className="flex items-center gap-2">
                {currentLanguage.label}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground"
              onSelect={(event) => {
                event.preventDefault()
                setView("currency")
              }}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                <span>Currency</span>
              </span>
              <span className="flex items-center gap-2">
                {currentCurrency.code}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="px-2 py-2.5 text-[14px] font-normal text-foreground">
              <Link href="/support-center" className="flex items-center">
                <CircleHelp className="mr-2 h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                Support center
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2 py-2.5 text-[14px] font-normal text-foreground">
              <a href={AVANA_EXTERNAL_LINKS.privacy} target="_blank" rel="noreferrer" className="flex items-center">
                <Shield className="mr-2 h-3.5 w-3.5 text-[#01AACF]" strokeWidth={1.9} />
                Security & privacy
              </a>
            </DropdownMenuItem>
          </>
        ) : null}

        {view === "language" ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1 px-2 py-2 text-[16px] font-medium normal-case tracking-normal text-foreground">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground transition hover:bg-surface-inset"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Language</span>
            </DropdownMenuLabel>
            {LANGUAGE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.code}
                className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground"
                onSelect={(event) => {
                  event.preventDefault()
                  setLanguage(option.code)
                  setView("root")
                }}
              >
                <span>{option.label}</span>
                {option.code === language ? <Check className="h-4 w-4 text-brand" /> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        {view === "currency" ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1 px-2 py-2 text-[16px] font-medium normal-case tracking-normal text-foreground">
              <button
                type="button"
                onClick={() => setView("root")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-foreground transition hover:bg-surface-inset"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Currency</span>
            </DropdownMenuLabel>
            {CURRENCY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.code}
                className="flex cursor-pointer items-center justify-between px-2 py-2.5 text-[14px] font-normal text-foreground"
                onSelect={(event) => {
                  event.preventDefault()
                  setCurrency(option.code)
                  setView("root")
                }}
              >
                <span className="flex items-center gap-2">
                  <CurrencyFlag code={option.code} className="h-5 w-5" />
                  <span>{option.label}</span>
                </span>
                {option.code === currency ? <Check className="h-4 w-4 text-brand" /> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SandboxWalletDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { walletId, walletAddress, sandboxMode } = useAvanaSessions()
  const [copied, setCopied] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setCopied(false)
        }
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-medium tracking-[-0.02em] text-foreground">
            Sandbox wallet
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-5 text-muted-foreground">
            This workspace uses a built-in demo wallet. There is no external wallet connection yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-radius-md border border-border bg-surface-inset p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">Wallet</span>
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[12px] font-medium text-brand">
              {sandboxMode ? "Sandbox active" : "Connected"}
            </span>
          </div>
          <div>
            <div className="text-[18px] font-medium tracking-[-0.02em] text-foreground">{walletId}</div>
            <div className="mt-1 break-all text-[13px] text-muted-foreground">{walletAddress}</div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-radius-sm border border-border px-4 text-[14px] font-medium text-foreground transition-colors hover:bg-surface-inset"
            onClick={async () => {
              if (typeof navigator === "undefined" || !navigator.clipboard) return
              await navigator.clipboard.writeText(walletAddress)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-radius-sm bg-brand px-4 text-[14px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Header() {
  const pathname = usePathname()
  const desktopLinks = personalDesktopHeaderLinks
  const [mounted, setMounted] = useState(false)
  const [showDivider, setShowDivider] = useState(false)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const renderMobileBrand = () => <BrandIcon />
  const renderMobileActions = () => (
    <>
      <span className="-mr-1 flex items-center gap-0 [&>button+button]:-ml-3">
        {mounted ? <LazySearchCommandIconOnly /> : <SearchCommandIconPlaceholder />}
      </span>
      <SandboxSignInButton size="mobile" />
      <WalletButton size="mobile" />
    </>
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const resolveThreshold = () => headerRef.current?.offsetHeight ?? 68

    const readScrollOffset = (target?: EventTarget | null) => {
      if (target instanceof HTMLElement) {
        return target.scrollTop
      }

      return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop)
    }

    const updateDivider = (event?: Event) => {
      setShowDivider(readScrollOffset(event?.target) > resolveThreshold())
    }

    updateDivider()
    window.addEventListener("scroll", updateDivider, { passive: true })
    document.addEventListener("scroll", updateDivider, { capture: true, passive: true })

    return () => {
      window.removeEventListener("scroll", updateDivider)
      document.removeEventListener("scroll", updateDivider, true)
    }
  }, [mounted])

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 bg-background/95 text-foreground backdrop-blur transition-[box-shadow] duration-200 ${
        mounted && showDivider ? "shadow-[inset_0_-1px_0_hsl(var(--border))]" : "shadow-none"
      }`}
    >
      <div className="hidden lg:block">
          <div className="relative flex h-[68px] w-full items-center justify-between px-3 sm:px-4 lg:px-5 xl:px-6 2xl:px-8">
            <div className="flex shrink-0 items-center gap-2.5">
              <Link href="/" aria-label="Home" title="Home" className="flex shrink-0 items-center">
                <BrandLogo />
              </Link>

              <nav aria-label="Primary" className="flex min-w-0 items-center gap-0.5">
                {desktopLinks.slice(0, 4).map((link) => {
                  const isActive = mounted && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.icon ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center text-[#01AACF] transition-transform duration-200 ease-out group-hover:-translate-y-[1px]">
                          <link.icon className="h-6 w-6 shrink-0" />
                        </span>
                      ) : null}
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* In-flow centered middle column: a flex-1 child can never overlap the
                left nav the way the previous `absolute left-1/2` search did (it clipped
                the "Multiply" link at 1024-1440px). */}
            <div className="flex min-w-0 flex-1 justify-center px-4">
              <div className="w-full max-w-[320px] xl:max-w-[410px]">
                {mounted ? <LazySearchCommand /> : <SearchCommandPlaceholder />}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <div className="mr-0.5 flex items-center gap-0.5">
                {desktopLinks.slice(4).map((link) => {
                  const isActive = mounted && pathname.startsWith(link.href)
                  const isUtilityLink = link.href === "/dashboard" || link.href === "/rewards"

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group inline-flex items-center rounded-full px-2.5 py-1.5 font-sans text-[16px] font-normal leading-[1.15] transition-colors ${
                        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.icon ? (
                        <span
                          className={`inline-flex items-center justify-center text-[#01AACF] transition-transform duration-200 ease-out group-hover:-translate-y-[1px] ${
                            isUtilityLink ? "mr-1 h-6 w-6" : "mr-2 h-7 w-7"
                          }`}
                        >
                          <link.icon className={isUtilityLink ? "h-5 w-5 shrink-0" : "h-6 w-6 shrink-0"} />
                        </span>
                      ) : null}
                      {link.label}
                    </Link>
                  )
                })}
              </div>

              <PreferencesMenu />

              <SandboxSignInButton size="desktop" />
              <WalletButton size="desktop" />

            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="relative flex h-16 w-full items-center justify-between bg-background px-4 text-foreground sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="Home" title="Home" className="inline-flex items-center">
                {renderMobileBrand()}
              </Link>

              <LazyMobileMenu brand={renderMobileBrand()} />
            </div>

            <div className="flex items-center gap-0.5">
              {renderMobileActions()}
            </div>
          </div>
      </div>
      <SandboxWalletDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </header>
  )
}
