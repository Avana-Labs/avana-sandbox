"use client"

import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { MobileMenu } from "./mobile-menu"
import { businessDesktopHeaderLinks, getHeaderMode, personalDesktopHeaderLinks } from "./site-nav"

const utilityLinks = ["English/USD", "Support Center", "Light Theme"]
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

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="hidden h-[3px] w-full bg-[#2f2f2f] lg:block" />

      <div className="hidden lg:block">
        <div className="border-b border-[#e5e7eb] bg-[#fafafa]">
          <div className="mx-auto grid h-[38px] max-w-5xl grid-cols-[132px_minmax(0,1fr)] items-end gap-6 px-4">
            <div aria-hidden />
            <div className="flex min-w-0 items-end justify-between gap-5">
              <div className="inline-flex h-[34px] shrink-0 overflow-hidden rounded-t-[2px] border border-b-0 border-[#c9cdd2] bg-[#e5e5e5] text-[12px] font-semibold leading-none">
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

              <div className="flex min-w-0 items-center gap-[8px] pb-[5px] text-[11px] font-medium leading-none text-[#697078]">
                {utilityLinks.map((item, index) => (
                  <div key={item} className="flex shrink-0 items-center gap-[8px]">
                    {index > 0 ? <span className="text-[#c5c8cc]">|</span> : null}
                    <span className="whitespace-nowrap">{item}</span>
                  </div>
                ))}

                <div className="ml-[6px] flex h-[26px] w-[220px] shrink-0 items-center border border-[#aeb3b8] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="px-[9px] text-[11px] font-semibold text-[#5d6268]">Search</span>
                  <div className="ml-auto flex h-full w-[29px] items-center justify-center border-l border-[#aeb3b8] text-[#1f2328]">
                    <Search className="h-[15px] w-[15px]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white" style={{ borderTop: `3px solid ${activeMode.accent}` }}>
          <div className="mx-auto grid h-[72px] max-w-5xl grid-cols-[132px_minmax(0,1fr)] items-center gap-6 px-4">
            <Link href={mode === "business" ? "/business" : "/"} aria-label="Home" title="Home" className="flex items-center justify-start">
              <Image src={activeMode.logo} alt="Avana" width={210} height={56} className="h-[36px] w-auto object-contain" priority />
            </Link>

            <div className="flex items-center justify-start">
              <nav className="flex h-[48px] w-full items-stretch overflow-hidden rounded-[3px] border border-[#cdd1d5] bg-gradient-to-b from-[#f1f3f5] via-[#dfe3e7] to-[#c9ced3] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]">
                <div className="flex min-w-0 flex-1 items-stretch">
                  {desktopLinks.map((link) => {
                    const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="relative flex min-w-0 flex-1 items-center justify-center px-3 text-[12px] font-semibold leading-none text-[#3f454b] transition-colors hover:bg-[#d5dae0]"
                      >
                        <span
                          className="absolute inset-x-0 top-0 h-[3px] opacity-0"
                          style={isActive ? { backgroundColor: activeMode.accent, opacity: 1 } : undefined}
                        />
                        <span className="truncate">{link.label}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="relative flex w-[132px] shrink-0 items-center justify-end px-[10px]">
                  <Link
                    href="/login"
                    className="rounded-[4px] px-[18px] py-[9px] text-[11px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_1px_2px_rgba(15,23,42,0.1)] transition-opacity hover:opacity-90"
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
