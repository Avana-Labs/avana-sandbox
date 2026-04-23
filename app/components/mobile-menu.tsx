"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { getActiveSiteNav, siteNavLinks } from "./site-nav"

/** Compact mobile navigation for the core Avana routes. */
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const activeNav = getActiveSiteNav(pathname)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-xs border border-border bg-surface-raised text-foreground shadow-elev-1 hover:bg-surface-inset md:hidden"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription>Browse the main Avana routes and open the primary action.</SheetDescription>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-4">
            <div className="rounded-radius-sm border border-border bg-surface-inset p-3">
              <Link href="/" className="flex items-center gap-2 font-brand text-[15px] font-medium" onClick={() => setOpen(false)}>
                Avana
              </Link>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{activeNav.description}</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-0.5">
              {siteNavLinks.map((link) => {
                const Icon = link.icon
                const isActive = activeNav.href === link.href

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xs px-3 py-2.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-surface-inset text-foreground"
                        : "text-muted-foreground hover:bg-surface-inset/60 hover:text-foreground",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-3.5 w-3.5", isActive ? "text-foreground" : "text-muted-foreground")} />
                      <div>
                        <div>{link.label}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          {link.section}
                        </div>
                      </div>
                    </div>
                    {isActive ? <span className="h-1 w-1 rounded-full bg-foreground" /> : null}
                  </Link>
                )
              })}
            </div>
          </nav>
          <div className="mt-auto border-t border-border p-3">
            <Button
              className="w-full"
              variant="default"
              onClick={() => {
                router.push("/borrow")
                setOpen(false)
              }}
            >
              <Wallet className="h-3.5 w-3.5" />
              Get started
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
