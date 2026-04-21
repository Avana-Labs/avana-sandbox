"use client"
import Link from "next/link"
import { MobileMenu } from "./mobile-menu"
import { WalletConnect } from "./wallet-connect"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getActiveSiteNav, siteNavLinks } from "./site-nav"

export function Header() {
  const pathname = usePathname()
  const activeNav = getActiveSiteNav(pathname)
  const mainNavLinks = siteNavLinks
  const isResourcesActive =
    pathname === "/rewards" || pathname.startsWith("/rewards/") || pathname.startsWith("/risk-warning")
  const isDarkCanvas = pathname.startsWith("/perpv2") || pathname.startsWith("/perps")

  return (
    <header className={cn(
      "sticky top-0 z-40 border-b backdrop-blur",
      isDarkCanvas
        ? "border-white/10 bg-[hsl(222_14%_6%)]/90 text-slate-100 supports-[backdrop-filter]:bg-[hsl(222_14%_6%)]/80"
        : "border-foreground/20 bg-background/95 supports-[backdrop-filter]:bg-background/90"
    )}>
      <div className="flex h-[62px] 2xl:h-[52px] w-full items-center gap-4 2xl:gap-3 px-4 md:px-6 lg:px-8">
        <Link href="/" aria-label="Home" title="Home" className="shrink-0 flex items-center">
          <Image
            src="/Try.png"
            alt="Avana"
            width={142}
            height={30}
            className="h-6 w-auto object-contain md:h-6 2xl:h-5"
            priority
          />
        </Link>

        <nav className="ml-auto hidden items-stretch gap-0.5 md:flex">
          {mainNavLinks.map((link) => {
            const Icon = link.icon
            const isActive = activeNav.href === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group relative flex flex-row items-center justify-center gap-1.5 2xl:gap-1 px-3 py-2 2xl:px-2 2xl:py-1.5 text-[13px] 2xl:text-[12px] font-normal leading-none transition-colors",
                  isDarkCanvas
                    ? isActive
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                    : isActive
                      ? "text-foreground"
                      : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 2xl:h-[18px] 2xl:w-[18px] shrink-0 transition-colors",
                    isDarkCanvas
                      ? isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-white"
                      : isActive
                        ? "text-foreground"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                  )}
                />
                <span className="whitespace-nowrap">{link.label}</span>
              </Link>
            )
          })}

          <WalletConnect isResourcesActive={isResourcesActive} />
        </nav>

        <div className="ml-auto md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
