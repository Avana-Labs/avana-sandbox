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
    pathname === "/risk-warning" || pathname.startsWith("/risk-warning/")

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-[52px] 2xl:h-12 w-full items-center gap-4 2xl:gap-3 px-4 md:px-6 lg:px-8">
        <Link href="/" aria-label="Home" title="Home" className="shrink-0 flex items-center">
          <Image
            src="/Try.png"
            alt="Avana"
            width={142}
            height={30}
            className="h-6 w-auto object-contain md:h-6 2xl:h-5 dark:invert"
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
                  "group relative flex flex-row items-center justify-center gap-1.5 rounded-xs px-2.5 py-1.5 text-[12.5px] font-medium leading-none transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-surface-inset/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
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
