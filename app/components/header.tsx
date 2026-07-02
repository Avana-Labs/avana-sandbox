"use client"

import Link from "next/link"
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
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { BrandIcon, BrandLogo } from "./brand-logo"
import { LazyMobileMenu } from "./lazy-mobile-menu"
import { LazySearchCommand, LazySearchCommandIconOnly, SearchCommandIconPlaceholder, SearchCommandPlaceholder } from "./lazy-search-command"
import { personalDesktopHeaderLinks } from "./site-nav"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { WalletControl } from "@/app/components/wallet-control"
import { DesktopPreferenceControls } from "./desktop-preference-controls"

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
  const { t } = useTranslation()
  const desktopLinks = personalDesktopHeaderLinks
  const [mounted, setMounted] = useState(false)
  const [showDivider, setShowDivider] = useState(false)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
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
      <div className="hidden xl:block">
        <div className="grid h-[72px] w-full grid-cols-[minmax(0,1fr)_minmax(280px,420px)_minmax(0,1fr)] items-center gap-4 px-4 lg:px-5 xl:px-6 2xl:px-8">
          <div className="flex min-w-0 items-center gap-5 overflow-hidden">
            <Link href="/" aria-label="Home" title="Home" className="flex shrink-0 items-center">
              <BrandLogo className="h-[50px] md:h-[50px]" />
            </Link>

            <nav aria-label="Primary" className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {desktopLinks.slice(0, 4).map((link) => {
                const isActive = mounted && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href))

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center rounded-full px-3 py-2 font-sans text-[15px] font-medium leading-[1.1] transition-colors ${
                      isActive ? "bg-surface-inset text-foreground dark:bg-[#171717]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{t(link.label)}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex min-w-0 justify-center px-2">
            <div className="w-full">{mounted ? <LazySearchCommand /> : <SearchCommandPlaceholder />}</div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2.5">
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {desktopLinks.slice(4).map((link) => {
                const isActive = mounted && pathname.startsWith(link.href)

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center rounded-full px-3 py-2 font-sans text-[15px] font-medium leading-[1.1] transition-colors ${
                      isActive ? "bg-surface-inset text-foreground dark:bg-[#171717]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{t(link.label)}</span>
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

      <div className="xl:hidden">
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
