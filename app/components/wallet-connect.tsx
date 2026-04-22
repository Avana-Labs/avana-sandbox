"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CircleUserRound,
  Code2,
  FileText,
  LifeBuoy,
  Mail,
  Moon,
  Shield,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function AppsGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden className={className}>
      {[3, 9, 15].flatMap((cx) =>
        [3, 9, 15].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.7} fill="currentColor" />),
      )}
    </svg>
  )
}

type MenuLinkItem = {
  href: string
  label: string
  icon: LucideIcon
  newTab?: boolean
  internal?: boolean
}

function MenuLink({ href, label, icon: Icon, newTab, internal }: MenuLinkItem) {
  const outbound = !internal

  const itemContent = (
    <>
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {outbound ? <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden /> : null}
    </>
  )

  if (internal) {
    return (
      <DropdownMenuItem asChild>
        <Link href={href} className="cursor-pointer justify-between gap-2">
          {itemContent}
        </Link>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem asChild>
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className="cursor-pointer justify-between gap-2"
      >
        {itemContent}
      </a>
    </DropdownMenuItem>
  )
}

export function WalletConnect({ isResourcesActive = false }: { isResourcesActive?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuContentClass = "rounded-xl border border-border bg-popover p-1 shadow-md"

  const topLinks: MenuLinkItem[] = [
    {
      href: "/risk-warning",
      label: "Risk warning",
      icon: AlertTriangle,
      internal: true,
    },
    {
      href: "https://avana-ashen.vercel.app/faq",
      label: "Support center",
      icon: LifeBuoy,
      newTab: true,
    },
  ]

  const docsLinks: MenuLinkItem[] = [
    {
      href: "https://avana-ashen.vercel.app/lightpaper",
      label: "Lightpaper",
      icon: FileText,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/developers",
      label: "Developer docs",
      icon: Code2,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/privacy",
      label: "Privacy",
      icon: Shield,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/terms",
      label: "Terms",
      icon: FileText,
      newTab: true,
    },
  ]

  const moreLinks: MenuLinkItem[] = [
    {
      href: "mailto:support@avana.cc?subject=Avana%20Feedback",
      label: "Give feedback",
      icon: Mail,
    },
    {
      href: "https://avana-ashen.vercel.app/",
      label: "About Avana",
      icon: FileText,
      newTab: true,
    },
  ]

  return (
    <div className="flex items-center gap-3 2xl:gap-2 pl-2">
      <div className="h-8 2xl:h-6 w-px bg-foreground/20" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open resources and support"
            title="Resources and support"
            className={`flex h-9 w-9 2xl:h-7 2xl:w-7 appearance-none select-none items-center justify-center rounded-none border-transparent bg-transparent shadow-none outline-none ring-0 [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:bg-transparent active:ring-0 hover:bg-transparent ${
              isResourcesActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AppsGridIcon className="h-5 w-5 2xl:h-4 2xl:w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-64 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Global preferences
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center justify-between gap-2">
            <span className="text-[13px] text-muted-foreground">Theme</span>
            <div className="flex items-center rounded-full border border-border p-0.5">
              <button
                onClick={() => setTheme("system")}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full transition-colors",
                  mounted && theme === "system" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Auto
              </button>
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  mounted && theme === "light" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  mounted && theme === "dark" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <DropdownMenuItem className="cursor-pointer justify-between gap-2 text-[13px] text-muted-foreground">
            <span>Language</span>
            <span className="font-semibold text-foreground">English <span className="ml-1 opacity-50">&gt;</span></span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer justify-between gap-2 text-[13px] text-muted-foreground">
            <span>Currency</span>
            <span className="font-semibold text-foreground">USD <span className="ml-1 opacity-50">&gt;</span></span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          {topLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Docs
          </DropdownMenuLabel>
          {docsLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          {moreLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Sign in"
        title="Sign in"
        className="flex h-10 w-10 2xl:h-8 2xl:w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <CircleUserRound className="h-6 w-6 2xl:h-5 2xl:w-5" strokeWidth={1.5} />
      </button>
    </div>
  )
}
