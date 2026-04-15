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
          className="relative h-10 w-10 rounded-xl border border-border/70 bg-background text-foreground shadow-sm hover:bg-muted/40 md:hidden"
        >
          <Menu className="h-5 w-5 transition-transform duration-200" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription>Browse the main Avana routes and open the primary action.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <div className="border-b border-border/70 p-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <Link href="/" className="font-brand text-xl font-medium flex items-center gap-2" onClick={() => setOpen(false)}>
                Avana
              </Link>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeNav.description}</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              {siteNavLinks.map((link) => {
                const Icon = link.icon
                const isActive = activeNav.href === link.href

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "border-border bg-muted/35 text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/20 hover:text-foreground",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", isActive ? "text-foreground" : "text-muted-foreground")} />
                      <div>
                        <div>{link.label}</div>
                        <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {link.section}
                        </div>
                      </div>
                    </div>
                    {isActive ? <span className="h-2 w-2 rounded-full bg-foreground" /> : null}
                  </Link>
                )
              })}
            </div>
          </nav>
          <div className="mt-auto border-t border-border/70 p-4">
            <Button
              className="w-full rounded-xl"
              variant="outline"
              onClick={() => {
                router.push("/explore")
                setOpen(false)
              }}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Get Started
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
