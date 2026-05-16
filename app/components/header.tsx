"use client"

import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { MobileMenu } from "./mobile-menu"
import { businessDesktopHeaderLinks, getHeaderMode, personalDesktopHeaderLinks } from "./site-nav"

const utilityLinks = ["My Rewards", "English/USD", "Support Center", "Light Theme"]
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

export function Header() {
  const pathname = usePathname()
  const mode = getHeaderMode(pathname)
  const desktopLinks = mode === "business" ? businessDesktopHeaderLinks : personalDesktopHeaderLinks
  const activeMode = modeConfig[mode]
  const desktopNavItemWidth = mode === "business" ? "w-[132px]" : "w-[96px]"

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="hidden h-[3px] w-full bg-[#2f2f2f] lg:block" />

      <div className="hidden lg:block">
        <div className="border-b border-[#e5e7eb] bg-[#fafafa]">
          <div className="mx-auto grid h-[32px] max-w-5xl grid-cols-[126px_minmax(0,1fr)] items-end gap-3">
            <div aria-hidden />
            <div className="flex min-w-0 items-end justify-between gap-5">
              <div className="ml-[72px] inline-flex h-[28px] shrink-0 overflow-hidden rounded-t-[2px] border border-b-0 border-[#c9cdd2] bg-[#e5e5e5] text-[13px] font-semibold leading-none">
                {(["personal", "business"] as const).map((item) => {
                  const isActive = item === mode
                  const config = modeConfig[item]

                  return (
                    <Link
                      key={item}
                      href={config.href}
                      className="flex min-w-[88px] items-center justify-center px-4 text-center text-[#272a2f] transition-colors hover:bg-[#dadada]"
                      style={isActive ? { backgroundColor: config.accent, color: "#ffffff" } : undefined}
                    >
                      {config.label}
                    </Link>
                  )
                })}
              </div>

              <div className="flex min-w-0 items-center gap-[8px] pb-[4px] text-[11px] font-medium leading-none text-[#697078]">
                {utilityLinks.map((item, index) => (
                  <div key={item} className="flex shrink-0 items-center gap-[8px]">
                    {index > 0 ? <span className="text-[#c5c8cc]">|</span> : null}
                    <span className="whitespace-nowrap">{item}</span>
                  </div>
                ))}

                <div className="ml-[6px] flex h-[26px] w-[230px] shrink-0 items-center border border-[#d8dadd] bg-white px-[10px] text-[#777b80] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <Search className="h-[14px] w-[14px] shrink-0 text-[#8d9196]" strokeWidth={2.2} />
                  <span className="ml-[8px] min-w-0 flex-1 truncate text-[11px] font-medium">Search</span>
                  <span className="ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-[#f0f1f2] px-[5px] text-[11px] font-medium leading-none text-[#8a8e93]">
                    /
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white" style={{ borderTop: `3px solid ${activeMode.accent}` }}>
          <div className="mx-auto grid h-[60px] max-w-5xl grid-cols-[126px_minmax(0,1fr)] items-center gap-3">
            <Link href={mode === "business" ? "/business" : "/"} aria-label="Home" title="Home" className="flex items-center justify-start">
              <Image src={activeMode.logo} alt="Avana" width={300} height={150} className="h-[52px] w-auto object-contain" priority />
            </Link>

            <div className="flex items-center justify-start">
              <nav className="flex h-[42px] w-full items-stretch border border-[#d3d8de] bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                <div className="flex min-w-0 flex-1 items-stretch">
                  {desktopLinks.map((link) => {
                    const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`relative flex ${desktopNavItemWidth} shrink-0 items-center justify-center border-r border-[#d3d8de] bg-white px-3 text-[13px] font-medium leading-none text-[#343a40] transition-colors hover:bg-[#f6f8fa]`}
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
                    className="px-[18px] py-[8px] text-[13px] font-medium leading-none text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-opacity hover:opacity-90"
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
        <div className="flex h-14 w-full items-center gap-4 px-4">
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
