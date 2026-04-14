"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { siteNavLinks } from "./site-nav"

/** Compact mobile navigation for the core Avana routes. */
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden relative group hover:bg-accent">
          <Menu className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90 group-hover:scale-110 group-active:scale-95" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription>Browse the main Avana routes and open the primary action.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <Link href="/" className="text-xl font-semibold flex items-center gap-2" onClick={() => setOpen(false)}>
              Avana
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              {siteNavLinks.map((link) => {
                const Icon = link.icon

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 text-lg font-medium"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </nav>
          <div className="p-4 border-t mt-auto">
            <Button
              className="w-full"
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
