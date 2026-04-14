"use client"
import Link from "next/link"
import { MobileMenu } from "./mobile-menu"
import { WalletConnect } from "./wallet-connect"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { siteNavLinks } from "./site-nav"

export function Header() {
  const pathname = usePathname()

  return (
    <header className="container mx-auto bg-transparent px-4 pb-3 pt-4">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          <Link href="/" aria-label="Home" title="Home" className="flex items-center rounded-full">
            <Image
              src="/Try.png"
              alt="Avana"
              width={150}
              height={32}
              className="hidden h-6 w-auto object-contain md:block"
              priority
            />
            <span className="font-brand text-lg font-medium tracking-tight text-foreground md:hidden">Avana</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {siteNavLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group inline-flex h-8 items-center gap-1.5 rounded-full px-2 font-compact text-[12px] font-medium leading-none transition-colors ${
                    isActive
                      ? "border border-border bg-transparent text-foreground"
                      : "border border-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <WalletConnect />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
