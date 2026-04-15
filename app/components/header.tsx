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
  const mainNavLinks = siteNavLinks.filter((link) => link.href !== "/incentivize")
  const isResourcesActive =
    pathname.startsWith("/rewards-hub") || pathname.startsWith("/incentivize") || pathname.startsWith("/risk-warning")

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-[62px] 2xl:h-[48px] w-full items-center gap-4 2xl:gap-3 px-4 md:px-6 lg:px-8">
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
                  "group relative flex min-w-[72px] 2xl:min-w-[60px] flex-col items-center justify-center gap-1 2xl:gap-0.5 px-2 py-2 2xl:px-1.5 2xl:py-1 text-[13px] 2xl:text-[11px] font-normal leading-none transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 2xl:h-4 2xl:w-4 shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground/80 group-hover:text-foreground",
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
